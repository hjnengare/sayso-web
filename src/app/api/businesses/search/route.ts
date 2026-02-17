import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getSubcategoryLabel } from '@/app/utils/subcategoryPlaceholders';
import { getInterestIdForSubcategory } from '@/app/lib/onboarding/subcategoryMapping';
import { reRankByContactCompleteness } from '@/app/lib/utils/contactCompleteness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface BusinessSearchResult {
  id: string;
  name: string;
  category: string;
  subInterestId?: string;
  subInterestLabel?: string;
  interestId?: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  hours?: unknown;
  image_url?: string;
  verified: boolean;
  claim_status: 'unclaimed' | 'claimed' | 'pending';
  pending_by_user?: boolean; // true if current user has pending claim
  claimed_by_user?: boolean; // true if current user owns this business
  lat?: number | null;
  lng?: number | null;
  slug?: string | null;
  // Search relevance fields (from RPC)
  search_rank?: number;
  alias_boost?: number;
  fuzzy_similarity?: number;
  final_score?: number;
  matched_alias?: string;
}

// Type for RPC result (search_businesses returns lat, lng, slug, sub_interest_id)
interface SearchBusinessesResult {
  id: string;
  name: string;
  category: string;
  sub_interest_id?: string;
  interest_id?: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  hours?: unknown;
  image_url?: string;
  verified: boolean;
  lat?: number | null;
  lng?: number | null;
  slug?: string | null;
  search_rank?: number;
  alias_boost?: number;
  fuzzy_similarity?: number;
  final_score?: number;
  matched_alias?: string;
  is_system?: boolean | null;
  [key: string]: unknown;
}

type BusinessSearchResultWithHours = BusinessSearchResult & { hours?: unknown };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim();
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const verifiedOnly = searchParams.get('verified') === 'true';
    const location = searchParams.get('location') || null;

    if (!query || query.length < 2) {
      return NextResponse.json({ businesses: [] }, { status: 200 });
    }

    const supabase = await getServerSupabase();

    // Get current user if authenticated
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (error) {
      // User not authenticated, continue without user context
    }

    // Try intelligent search_businesses RPC function first
    // This combines: alias lookup → full-text search → fuzzy matching → ranking
    let businesses: SearchBusinessesResult[] = [];
    let usedFallback = false;

    const { data: rpcData, error: rpcError } = await supabase
      .rpc('search_businesses', {
        q: query,
        p_limit: Math.min(limit, 50), // Cap at 50
        p_offset: offset,
        p_verified_only: verifiedOnly,
        p_location: location,
      });

    if (rpcError) {
      console.warn('[SEARCH API] RPC search_businesses error:', {
        message: rpcError.message,
        code: rpcError.code,
        details: (rpcError as any).details,
        hint: (rpcError as any).hint,
      });

      // Fallback to simple ILIKE search for ANY RPC error (missing function,
      // SQL errors, permission errors, etc.) so search never fully breaks.
      console.log('[SEARCH API] Falling back to ILIKE search');
      usedFallback = true;

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('businesses')
        .select('id, name, primary_subcategory_slug, primary_subcategory_label, primary_category_slug, location, address, phone, email, website, hours, image_url, verified, lat, lng, slug, is_system')
        .eq('status', 'active')
        .neq('is_system', true)
        .or(`name.ilike.%${query}%, description.ilike.%${query}%, primary_subcategory_slug.ilike.%${query}%, primary_subcategory_label.ilike.%${query}%`)
        .limit(limit);

      if (fallbackError) {
        console.error('[SEARCH API] Fallback search error:', fallbackError);
        return NextResponse.json(
          { error: 'Failed to search businesses' },
          { status: 500 }
        );
      }

      businesses = (fallbackData || []).map((row: {
        id: string;
        name: string;
        primary_subcategory_slug?: string | null;
        primary_subcategory_label?: string | null;
        primary_category_slug?: string | null;
        location: string;
        address?: string | null;
        phone?: string | null;
        email?: string | null;
        website?: string | null;
        hours?: unknown;
        image_url?: string | null;
        verified: boolean;
        lat?: number | null;
        lng?: number | null;
        slug?: string | null;
      }) => ({
        id: row.id,
        name: row.name,
        category: row.primary_subcategory_label ?? row.primary_subcategory_slug ?? '',
        sub_interest_id: row.primary_subcategory_slug ?? undefined,
        interest_id: row.primary_category_slug ?? undefined,
        location: row.location,
        address: row.address ?? undefined,
        phone: row.phone ?? undefined,
        email: row.email ?? undefined,
        website: row.website ?? undefined,
        hours: row.hours ?? undefined,
        image_url: row.image_url ?? undefined,
        verified: row.verified,
        lat: row.lat ?? null,
        lng: row.lng ?? null,
        slug: row.slug ?? null,
        is_system: (row as { is_system?: boolean | null }).is_system ?? null,
      }));
    } else {
      businesses = (rpcData || []) as SearchBusinessesResult[];
    }

    businesses = businesses.filter((business) => business.is_system !== true);

    if (businesses.length === 0) {
      return NextResponse.json({
        businesses: [],
        meta: { usedFallback, query }
      }, { status: 200 });
    }

    const businessIds = businesses.map(b => b.id);

    const { data: ownershipRows, error: ownershipError } = await supabase
      .from('businesses')
      .select('id, owner_id, owner_verified')
      .in('id', businessIds)
      .neq('is_system', true); // Exclude system businesses

    if (ownershipError) {
      console.warn('[SEARCH API] ownership flags lookup failed:', ownershipError.message);
    }

    const ownershipByBusinessId = new Map<
      string,
      { owner_id: string | null; owner_verified: boolean | null }
    >(
      ((ownershipRows || []) as Array<{ id: string; owner_id: string | null; owner_verified: boolean | null }>)
        .map((row) => [row.id, { owner_id: row.owner_id, owner_verified: row.owner_verified }]),
    );

    // Check claim status for each business
    const results: BusinessSearchResultWithHours[] = [];

    if (userId) {
      // Check if user owns any of these businesses
      const { data: ownedBusinesses } = await supabase
        .from('business_owners')
        .select('business_id')
        .eq('user_id', userId)
        .in('business_id', businessIds);

      const ownedBusinessIds = new Set(
        (ownedBusinesses || []).map(o => o.business_id)
      );

      // Check if user has pending claims for any of these businesses
      const { data: pendingRequests } = await supabase
        .from('business_claims')
        .select('business_id')
        .eq('claimant_user_id', userId)
        .in('status', ['draft', 'pending', 'action_required', 'under_review'])
        .in('business_id', businessIds);

      const pendingBusinessIds = new Set(
        (pendingRequests || []).map(r => r.business_id)
      );

      // Check which businesses are claimed by anyone
      const { data: allOwners } = await supabase
        .from('business_owners')
        .select('business_id')
        .in('business_id', businessIds);

      const claimedBusinessIds = new Set(
        (allOwners || []).map(o => o.business_id)
      );

      // Build results with claim status
      for (const business of businesses) {
        const ownership = ownershipByBusinessId.get(business.id);
        const isOwnedByUser =
          ownedBusinessIds.has(business.id) || (ownership?.owner_id != null && ownership.owner_id === userId);
        const hasPendingByUser = pendingBusinessIds.has(business.id);
        const isClaimedByOwnerFlags = Boolean(ownership?.owner_verified) || ownership?.owner_id != null;
        const isClaimed = claimedBusinessIds.has(business.id) || isClaimedByOwnerFlags;

        let claim_status: 'unclaimed' | 'claimed' | 'pending';
        if (isOwnedByUser) {
          claim_status = 'claimed';
        } else if (hasPendingByUser) {
          claim_status = 'pending';
        } else if (isClaimed) {
          claim_status = 'claimed';
        } else {
          claim_status = 'unclaimed';
        }

        const subInterestId = (business as SearchBusinessesResult & { primary_subcategory_slug?: string }).primary_subcategory_slug ?? business.sub_interest_id ?? undefined;
        const subInterestLabel = subInterestId ? getSubcategoryLabel(subInterestId) : undefined;
        const interestId = (business as SearchBusinessesResult & { primary_category_slug?: string }).primary_category_slug ?? business.interest_id ?? (subInterestId ? getInterestIdForSubcategory(subInterestId) : undefined);
        const categorySlug = (business as SearchBusinessesResult & { primary_subcategory_slug?: string }).primary_subcategory_slug ?? (business as { category?: string }).category;
        const categoryLabel = (business as SearchBusinessesResult & { primary_subcategory_label?: string }).primary_subcategory_label ?? subInterestLabel ?? getSubcategoryLabel(categorySlug ?? '') ?? categorySlug;

        results.push({
          id: business.id,
          name: business.name,
          category: categoryLabel,
          subInterestId,
          subInterestLabel,
          interestId: interestId || undefined,
          location: business.location,
          address: business.address,
          phone: business.phone,
          email: business.email,
          website: business.website,
          hours: business.hours,
          image_url: business.image_url,
          verified: business.verified,
          claim_status,
          pending_by_user: hasPendingByUser,
          claimed_by_user: isOwnedByUser,
          lat: business.lat ?? null,
          lng: business.lng ?? null,
          slug: business.slug ?? null,
          search_rank: business.search_rank,
          alias_boost: business.alias_boost,
          fuzzy_similarity: business.fuzzy_similarity,
          final_score: business.final_score,
          matched_alias: business.matched_alias,
        });
      }
    } else {
      // User not authenticated - check if businesses are claimed by anyone
      const { data: allOwners } = await supabase
        .from('business_owners')
        .select('business_id')
        .in('business_id', businessIds);

      const claimedBusinessIds = new Set(
        (allOwners || []).map(o => o.business_id)
      );

      // Build results without user-specific status
      for (const business of businesses) {
        const ownership = ownershipByBusinessId.get(business.id);
        const isClaimedByOwnerFlags = Boolean(ownership?.owner_verified) || ownership?.owner_id != null;
        const subInterestId = (business as SearchBusinessesResult & { primary_subcategory_slug?: string }).primary_subcategory_slug ?? business.sub_interest_id ?? undefined;
        const subInterestLabel = subInterestId ? getSubcategoryLabel(subInterestId) : undefined;
        const interestId = (business as SearchBusinessesResult & { primary_category_slug?: string }).primary_category_slug ?? business.interest_id ?? (subInterestId ? getInterestIdForSubcategory(subInterestId) : undefined);
        const categorySlug = (business as SearchBusinessesResult & { primary_subcategory_slug?: string }).primary_subcategory_slug ?? (business as { category?: string }).category;
        const categoryLabel = (business as SearchBusinessesResult & { primary_subcategory_label?: string }).primary_subcategory_label ?? subInterestLabel ?? getSubcategoryLabel(categorySlug ?? '') ?? categorySlug;

        results.push({
          id: business.id,
          name: business.name,
          category: categoryLabel,
          subInterestId,
          subInterestLabel,
          interestId: interestId || undefined,
          location: business.location,
          address: business.address,
          phone: business.phone,
          email: business.email,
          website: business.website,
          hours: business.hours,
          image_url: business.image_url,
          verified: business.verified,
          claim_status: claimedBusinessIds.has(business.id) || isClaimedByOwnerFlags ? 'claimed' : 'unclaimed',
          pending_by_user: false,
          claimed_by_user: false,
          lat: business.lat ?? null,
          lng: business.lng ?? null,
          slug: business.slug ?? null,
          search_rank: business.search_rank,
          alias_boost: business.alias_boost,
          fuzzy_similarity: business.fuzzy_similarity,
          final_score: business.final_score,
          matched_alias: business.matched_alias,
        });
      }
    }

    const rankedResults = reRankByContactCompleteness(results, { baseRankWeight: 6 });
    const responseBusinesses: BusinessSearchResult[] = rankedResults.map(({ hours: _hours, ...rest }) => rest);

    return NextResponse.json({
      businesses: responseBusinesses,
      meta: {
        usedFallback,
        query,
        // Include the best matched alias if available
        matchedAlias: responseBusinesses[0]?.matched_alias || null,
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error in business search API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
