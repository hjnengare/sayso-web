import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { CachePresets } from "@/app/lib/utils/httpCache";
import {
  calculateDistanceKm,
  highlightText,
  extractSnippet,
  calculateComboScore,
  priceRangeToLevel,
  isValidLatitude,
  isValidLongitude,
} from "@/app/lib/utils/searchHelpers";
import {
  calculatePersonalizationScore,
  sortByPersonalization,
  filterByDealbreakers as filterBusinessesByDealbreakers,
  boostPersonalMatches,
  type BusinessForScoring,
  type UserPreferences,
} from "@/app/lib/services/personalizationService";
import { normalizeBusinessImages, type BusinessImage } from "@/app/lib/utils/businessImages";
import { getSubcategoryLabel } from "@/app/utils/subcategoryPlaceholders";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Use Node.js runtime to avoid Edge Runtime warnings with Supabase

/**
 * Fetch user preferences (interests, subcategories, deal breakers)
 */
async function fetchUserPreferences(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  userId: string | null
): Promise<UserPreferences> {
  if (!userId) {
    return {
      interestIds: [],
      subcategoryIds: [],
      dealbreakerIds: [],
    };
  }

  try {
    // Fetch all preference types in parallel for speed
    const [interestsResult, subcategoriesResult, dealbreakersResult] = await Promise.all([
      supabase.from('user_interests').select('interest_id').eq('user_id', userId),
      supabase.from('user_subcategories').select('subcategory_id').eq('user_id', userId),
      supabase.from('user_dealbreakers').select('dealbreaker_id').eq('user_id', userId),
    ]);

    const interestIds = (interestsResult.data || []).map(i => i.interest_id);
    const subcategoryIds = (subcategoriesResult.data || []).map(s => s.subcategory_id);
    const dealbreakerIds = (dealbreakersResult.data || []).map(d => d.dealbreaker_id);

    return {
      interestIds,
      subcategoryIds,
      dealbreakerIds,
    };
  } catch (error) {
    console.warn('[BUSINESSES API] Error fetching user preferences:', error);
    return {
      interestIds: [],
      subcategoryIds: [],
      dealbreakerIds: [],
    };
  }
}

/**
 * Log search history (non-blocking, doesn't fail main request)
 */
async function logSearchHistory(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  userId: string | null,
  query: string | null,
  lat: number | null,
  lng: number | null,
  radiusKm: number | null,
  sort: string | null
) {
  if (!userId || !query || query.trim().length === 0) {
    return; // Only log if user_id and query are provided
  }

  try {
    await supabase.from('search_history').insert({
      user_id: userId,
      query: query.trim(),
      lat: lat !== null && isValidLatitude(lat) ? lat : null,
      lng: lng !== null && isValidLongitude(lng) ? lng : null,
      radius_km: radiusKm !== null && radiusKm > 0 ? radiusKm : null,
      sort: sort || null,
    });
  } catch (error) {
    // Silently fail - don't break the main request
    console.warn('[BUSINESSES API] Failed to log search history:', error);
  }
}

// Type for the RPC response
interface BusinessRPCResult {
  id: string;
  name: string;
  description: string | null;
  category: string;
  interest_id?: string | null;
  sub_interest_id?: string | null;
  location: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  uploaded_images: string[] | null;
  verified: boolean;
  price_range: string;
  badge: string | null;
  slug: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
  total_reviews: number;
  average_rating: number;
  percentiles: Record<string, number> | null;
  distance_km: number | null;
  cursor_id: string;
  cursor_created_at: string;
  personalization_score?: number;
  diversity_rank?: number;
}

const BUSINESS_SELECT = `
  id, name, description, category, interest_id, sub_interest_id, location, address,
  phone, email, website, image_url,
  verified, price_range, badge, slug, lat, lng,
  created_at, updated_at,
  business_stats (
    total_reviews, average_rating, percentiles
  ),
  business_images (
    id,
    url,
    type,
    sort_order,
    is_primary
  )
`;

type SupabaseClientInstance = Awaited<ReturnType<typeof getServerSupabase>>;

type DatabaseBusinessRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  interest_id: string | null;
  sub_interest_id: string | null;
  location: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  business_images?: BusinessImage[] | null;
  verified: boolean;
  price_range: string;
  badge: string | null;
  slug: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
  business_stats?: Array<{
    total_reviews: number | null;
    average_rating: number | null;
    percentiles: Record<string, number> | null;
  }>;
};

// Mapping of interests to subcategories
const INTEREST_TO_SUBCATEGORIES: Record<string, string[]> = {
  'food-drink': ['restaurants', 'cafes', 'bars', 'fast-food', 'fine-dining'],
  'beauty-wellness': ['gyms', 'spas', 'salons', 'wellness', 'nail-salons'],
  'professional-services': ['education-learning', 'transport-travel', 'finance-insurance', 'plumbers', 'electricians', 'legal-services'],
  'outdoors-adventure': ['hiking', 'cycling', 'water-sports', 'camping'],
  'experiences-entertainment': ['events-festivals', 'sports-recreation', 'nightlife', 'comedy-clubs'],
  'arts-culture': ['museums', 'galleries', 'theaters', 'concerts'],
  'family-pets': ['family-activities', 'pet-services', 'childcare', 'veterinarians'],
  'shopping-lifestyle': ['fashion', 'electronics', 'home-decor', 'books'],
};

/**
 * Search term synonyms mapping
 * Automatically expands search queries to include common variations
 * This makes search flexible and handles spelling variations, regional terms, etc.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  // Coffee & Cafes
  'coffee': ['cafe', 'cafes', 'caffee', 'caffees', 'coffee shop', 'coffee house', 'coffeehouse', 'espresso'],
  'cafe': ['coffee', 'cafes', 'caffee', 'caffees', 'coffee shop', 'coffeehouse'],
  'cafes': ['coffee', 'cafe', 'caffee', 'caffees', 'coffee shop'],

  // Fitness & Gyms
  'gym': ['fitness', 'workout', 'fitness center', 'training', 'exercise'],
  'fitness': ['gym', 'workout', 'training', 'exercise'],

  // Restaurants & Dining
  'restaurant': ['dining', 'eatery', 'diner', 'bistro', 'brasserie'],
  'dining': ['restaurant', 'eatery', 'diner'],
  'eatery': ['restaurant', 'dining', 'diner'],

  // Bars & Nightlife
  'bar': ['pub', 'tavern', 'lounge', 'nightclub'],
  'pub': ['bar', 'tavern', 'lounge'],

  // Beauty & Wellness
  'salon': ['beauty salon', 'hair salon', 'hairdresser', 'stylist'],
  'spa': ['wellness', 'massage', 'beauty spa', 'day spa'],
  'hairdresser': ['hair salon', 'salon', 'stylist', 'barber'],
  'barber': ['barbershop', 'hairdresser', 'hair salon'],

  // Shopping
  'shop': ['store', 'boutique', 'retail'],
  'store': ['shop', 'boutique', 'retail'],
  'boutique': ['shop', 'store', 'retail'],
};

/**
 * Expand search query with synonyms for better matching
 * Returns the primary synonym that's most likely to match in the database
 * Example: "coffee" → "cafe" (because businesses are often categorized as "cafes")
 */
function expandSearchWithSynonyms(query: string): string {
  if (!query || query.trim().length === 0) {
    return query;
  }

  const lowerQuery = query.toLowerCase().trim();

  // Check if the full query has a primary synonym (first in list is usually most common)
  const fullQuerySynonyms = SEARCH_SYNONYMS[lowerQuery];
  if (fullQuerySynonyms && fullQuerySynonyms.length > 0) {
    // Return the first synonym as it's typically the most common term
    const primarySynonym = fullQuerySynonyms[0];

    console.log('[BUSINESSES API] Search query expansion:', {
      original: query,
      primarySynonym,
      allSynonyms: fullQuerySynonyms,
    });

    // For cafe-related searches, prefer "cafe" as it matches the category
    if (lowerQuery === 'coffee') {
      return 'cafe';
    }

    return primarySynonym;
  }

  // No synonym found, return original
  console.log('[BUSINESSES API] No synonyms found for:', query);
  return query;
}

export async function GET(req: Request) {
  const requestStart = Date.now();
  const withDuration = (response: NextResponse) => {
    response.headers.set('X-Duration-Ms', String(Date.now() - requestStart));
    return response;
  };

  try {
    // =============================================
    // CRITICAL: Create Supabase client WITH request cookies
    // This ensures server-side auth works correctly
    // =============================================
    const supabase = await getServerSupabase(req); // ✅ Pass request to get cookies
    
    // =============================================
    // RLS TRUTH TEST: Check if server can see user and businesses
    // =============================================
    const authStart = Date.now();
    const { data: { user: serverUser }, error: authError } = await supabase.auth.getUser();
    console.log('[BUSINESSES API] Auth duration ms:', Date.now() - authStart);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 [BUSINESSES API] Server Auth Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[BUSINESSES API] Server user:', {
      userId: serverUser?.id ?? null,
      email: serverUser?.email ?? null,
      hasUser: !!serverUser,
      authError: authError ? {
        message: authError.message,
        status: authError.status,
      } : null,
    });

    const requestUrl = req?.url ?? `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/businesses`;
    const { searchParams } = new URL(requestUrl);

    // Pagination parameters - use cursor-based (keyset) pagination
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const cursorId = searchParams.get('cursor_id') || null;
    const cursorCreatedAt = searchParams.get('cursor_created_at') || null;

    // Filter parameters
    const category = searchParams.get('category') || null;
    const badge = searchParams.get('badge') || null;
    const verified = searchParams.get('verified') === 'true' ? true : null;
    const priceRange = searchParams.get('price_range') || null;
    const location = searchParams.get('location') || null;
    const minRating = searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : null;

    // Interest-based filtering
    const interestIdsParam = searchParams.get('interest_ids');
    const interestIds = interestIdsParam
      ? interestIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    // Sub-interest (subcategory) filtering
    const subInterestIdsParam = searchParams.get('sub_interest_ids');
    const subInterestIds = subInterestIdsParam
      ? subInterestIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    // Enhanced search parameters with synonym expansion
    // Support both 'q' (new) and 'search' (backward compatible)
    const rawQuery = searchParams.get('q') || searchParams.get('search') || null;
    const expandedQuery = rawQuery ? expandSearchWithSynonyms(rawQuery) : null;
    const q = expandedQuery;
    const search = expandedQuery; // Keep for backward compatibility

    // Enhanced location parameters
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const lat = latParam ? parseFloat(latParam) : null;
    const lng = lngParam ? parseFloat(lngParam) : null;
    const radiusKm = searchParams.get('radius_km') ? parseFloat(searchParams.get('radius_km')!) : null;

    // Enhanced sorting parameters
    const sortParam = searchParams.get('sort');
    let sortBy = searchParams.get('sort_by') || 'created_at';
    let sortOrder = searchParams.get('sort_order') || 'desc';

    // Map new 'sort' param to sortBy/sortOrder
    if (sortParam) {
      switch (sortParam) {
        case 'relevance':
          sortBy = q ? 'relevance' : 'rating';
          sortOrder = 'desc';
          break;
        case 'distance':
          if (lat !== null && lng !== null) {
            sortBy = 'distance';
            sortOrder = 'asc';
          }
          break;
        case 'rating_desc':
          sortBy = 'rating';
          sortOrder = 'desc';
          break;
        case 'price_asc':
          sortBy = 'price';
          sortOrder = 'asc';
          break;
        case 'combo':
          if (lat !== null && lng !== null) {
            sortBy = 'combo';
            sortOrder = 'desc';
          }
          break;
      }
    } else if (q && !sortParam) {
      // Default to relevance when q is present
      sortBy = 'relevance';
      sortOrder = 'desc';
    }

    // Use serverUser from auth check above
    const userId = serverUser?.id || null;
    const preferredPriceRanges = searchParams.get('preferred_price_ranges')
      ? searchParams.get('preferred_price_ranges')!.split(',').map(range => range.trim()).filter(Boolean)
      : [];
    const dealbreakerIds = searchParams.get('dealbreakers')
      ? searchParams.get('dealbreakers')!.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    const feedStrategy = (searchParams.get('feed_strategy') as 'mixed' | 'standard' | null) || 'standard';

    // Legacy location parameters (keep for backward compatibility)
    const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : (radiusKm || 10);

    // Map interests to subcategories (legacy mapping, kept for backward compatibility)
    const subcategoriesToFilter: string[] = [];
    if (interestIds.length > 0) {
      for (const interestId of interestIds) {
        const subcats = INTEREST_TO_SUBCATEGORIES[interestId];
        if (subcats) {
          subcategoriesToFilter.push(...subcats);
        }
      }
    }

    if (feedStrategy === 'mixed') {
      // Server-side preference resolution: if the client didn't pass
      // interest/subcategory IDs but we have an authenticated user,
      // fetch them here so the client doesn't have to wait for a
      // separate preferences API call before requesting the feed.
      let resolvedInterestIds = interestIds;
      let resolvedSubInterestIds = subInterestIds.length > 0 ? subInterestIds : subcategoriesToFilter;
      let resolvedDealbreakerIds = dealbreakerIds;

      if (userId && interestIds.length === 0 && subInterestIds.length === 0) {
        const prefsStart = Date.now();
        const userPrefs = await fetchUserPreferences(supabase, userId);
        console.log('[BUSINESSES API] Server-side prefs fetch ms:', Date.now() - prefsStart);
        resolvedInterestIds = userPrefs.interestIds;
        resolvedDealbreakerIds = dealbreakerIds.length > 0 ? dealbreakerIds : userPrefs.dealbreakerIds;

        // Map resolved interests to subcategories for broader matching
        const mappedSubcategories: string[] = [];
        for (const iid of resolvedInterestIds) {
          const subcats = INTEREST_TO_SUBCATEGORIES[iid];
          if (subcats) mappedSubcategories.push(...subcats);
        }
        resolvedSubInterestIds = userPrefs.subcategoryIds.length > 0
          ? userPrefs.subcategoryIds
          : mappedSubcategories;
      }

      // Use the Netflix-style two-stage recommender (V2)
      const response = await handleMixedFeedV2({
        supabase,
        limit,
        category,
        badge,
        verified,
        priceRange,
        preferredPriceRanges,
        location,
        minRating,
        interestIds: resolvedInterestIds,
        subInterestIds: resolvedSubInterestIds,
        dealbreakerIds: resolvedDealbreakerIds,
        sortBy,
        sortOrder,
        latitude: lat,
        longitude: lng,
        userId,
      });
      return withDuration(response);
    }

    // =============================================
    // RLS TRUTH TEST (standard feed only — mixed feed skips this)
    // =============================================
    const countStart = Date.now();
    const { count: visibleCount, error: countError } = await supabase
      .from('businesses')
      .select('id', { head: true, count: 'exact' })
      .eq('status', 'active');
    console.log('[BUSINESSES API] Visible count duration ms:', Date.now() - countStart);

    if (visibleCount === 0 && !countError) {
      console.warn('[BUSINESSES API] RLS returned 0 businesses — check policies');
    }

    // Try to use the optimized RPC function for listing, fallback to regular query
    let businesses: BusinessRPCResult[] | null = null;
    let error: any = null;

    // Check if RPC function exists, if not fallback to regular query
    try {
      const rpcParams = {
        p_limit: limit,
        p_cursor_id: cursorId,
        p_cursor_created_at: cursorCreatedAt,
        p_category: category,
        p_location: location,
        p_verified: verified,
        p_price_range: priceRange,
        p_badge: badge,
        p_min_rating: minRating,
        p_search: search,
        p_latitude: lat,
        p_longitude: lng,
        p_radius_km: radius,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
      };
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 [BUSINESSES API] Calling RPC with params:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[BUSINESSES API] RPC params:', JSON.stringify(rpcParams, null, 2));
      
      const { data, error: rpcError } = await supabase.rpc('list_businesses_optimized', rpcParams);

      if (rpcError) {
        console.error('[BUSINESSES API] RPC error:', {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        });
        
        // Check if RPC function doesn't exist OR if it's a column error (uploaded_image)
        if (rpcError.code === '42883' || rpcError.code === 'PGRST301' || 
            rpcError.code === '42703' || // undefined_column
            rpcError.message?.includes('uploaded_image') ||
            rpcError.message?.includes('column') && rpcError.message?.includes('does not exist')) {
          // RPC function doesn't exist or has schema issues, use fallback
          console.log('[BUSINESSES API] RPC function error detected, using fallback query');
          throw new Error('RPC not found or schema error');
        }
        
        // For other RPC errors, still try fallback
        console.log('[BUSINESSES API] RPC returned error, trying fallback query');
        throw new Error('RPC error');
      }

      // RPC succeeded - process results
      if (data && Array.isArray(data)) {
        if (data.length > 0) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ [BUSINESSES API] RPC returned', data.length, 'businesses');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('[BUSINESSES API] Sample businesses:', data.slice(0, 3).map((b: { id: string; name: string; category: string; location: string; uploaded_images?: string[] }) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            location: b.location,
            uploaded_images_count: Array.isArray(b.uploaded_images) ? b.uploaded_images.length : 0,
          })));
          
          // Normalize RPC rows to lat/lng (RPC may return latitude/longitude)
          const normalized = (data as Array<Record<string, unknown>>).map((row) => {
            const b = { ...row } as unknown as BusinessRPCResult;
            b.lat = (row.lat as number | null) ?? (row.latitude as number | null) ?? null;
            b.lng = (row.lng as number | null) ?? (row.longitude as number | null) ?? null;
            return b;
          });

          // Calculate distance for RPC results if lat/lng provided
          if (lat !== null && lng !== null && isValidLatitude(lat) && isValidLongitude(lng)) {
            businesses = normalized.map((b) => {
              if (b.lat != null && b.lng != null) {
                b.distance_km = calculateDistanceKm(lat, lng, b.lat, b.lng);
              }
              return b;
            });
            
            // Apply radius filter if provided
            if (radiusKm !== null && radiusKm > 0) {
              businesses = businesses.filter(
                (b) => b.distance_km !== null && b.distance_km <= radiusKm
              );
            }
          } else {
            businesses = normalized;
          }
        } else {
          // RPC returned empty array - this is valid, not an error
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('⚠️  [BUSINESSES API] RPC returned 0 businesses (empty result)');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('[BUSINESSES API] Query filters:', {
            category,
            location,
            sortBy,
            sortOrder,
            limit,
            verified,
            priceRange,
            badge,
            minRating,
            search,
            lat,
            lng,
            radius,
          });
          console.log('[BUSINESSES API] This could mean:');
          console.log('[BUSINESSES API]   1. No businesses match the filters');
          console.log('[BUSINESSES API]   2. Category/location values don\'t match database values');
          console.log('[BUSINESSES API]   3. RLS policies are blocking results');
          businesses = [];
        }
      } else {
        console.log('[BUSINESSES API] RPC returned null/undefined data, trying fallback');
        throw new Error('RPC returned null');
      }
      error = null;
    } catch (rpcError: any) {
      // Fallback to regular query if RPC doesn't exist
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 [BUSINESSES API] Using fallback query method');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[BUSINESSES API] Fallback query filters:', {
        category,
        location,
        verified,
        priceRange,
        badge,
        minRating,
        sortBy,
        sortOrder,
        limit,
      });
      
      let query = supabase
        .from('businesses')
        .select(`
          id, name, description, category, interest_id, sub_interest_id, location, address, 
          phone, email, website, image_url,
          verified, price_range, badge, slug, created_at, updated_at,
          business_stats (
            total_reviews, average_rating, percentiles
          ),
          business_images (
            id,
            url,
            type,
            sort_order,
            is_primary
          )
        `);

      // Only chain methods if they exist (defensive for test mocks)
      if (typeof (query as any).eq === 'function') {
        query = (query as any).eq('status', 'active');
      }

      // Apply filters (only if methods exist)
      if (typeof (query as any).eq === 'function') {
        // Use exact match for category (case-sensitive)
        // Note: RPC function uses ILIKE for case-insensitive matching
        if (category) {
          console.log('[BUSINESSES API] Fallback: Applying category filter:', category);
          query = (query as any).eq('category', category);
        }
        if (badge) {
          console.log('[BUSINESSES API] Fallback: Applying badge filter:', badge);
          query = (query as any).eq('badge', badge);
        }
        if (verified !== null) {
          console.log('[BUSINESSES API] Fallback: Applying verified filter:', verified);
          query = (query as any).eq('verified', verified);
        }
        if (priceRange) {
          console.log('[BUSINESSES API] Fallback: Applying priceRange filter:', priceRange);
          query = (query as any).eq('price_range', priceRange);
        }
      }
      
      // Interest-based filtering: filter by interest_id directly OR by mapped subcategories
      if (typeof (query as any).in === 'function') {
        if (interestIds.length > 0) {
          console.log('[BUSINESSES API] Filtering by interest_id:', interestIds);
          console.log('[BUSINESSES API] ⚠️ If this returns 0 results, check:');
          console.log('[BUSINESSES API]   1. Do businesses have interest_id populated?');
          console.log('[BUSINESSES API]   2. Do interest_id values match? (e.g., "food-drink" vs "Food & Drink")');
          console.log('[BUSINESSES API]   → Run: SELECT interest_id, COUNT(*) FROM businesses GROUP BY interest_id;');
          query = (query as any).in('interest_id', interestIds);
        }
        // Apply sub_interest_id filtering if provided (takes precedence over mapped subcategories)
        if (subInterestIds.length > 0) {
          console.log('[BUSINESSES API] Fallback: Filtering by sub_interest_id:', subInterestIds);
          query = (query as any).in('sub_interest_id', subInterestIds);
        } else if (subcategoriesToFilter && subcategoriesToFilter.length > 0) {
          console.log('[BUSINESSES API] Fallback: Filtering by mapped subcategories:', subcategoriesToFilter);
          query = (query as any).in('category', subcategoriesToFilter);
        }
      }
      
      if (typeof (query as any).ilike === 'function' && location) {
        console.log('[BUSINESSES API] Fallback: Applying location filter (ILIKE):', location);
        query = (query as any).ilike('location', `%${location}%`);
      }
      
      // Search: use ILIKE across name, description, category, location for reliable results
      // (search_vector may not exist or may be empty; ILIKE ensures matches)
      if (typeof (query as any).or === 'function' && q) {
        const escapeLike = (s: string) =>
          s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        const safeQ = escapeLike(q);
        query = (query as any).or(
          `name.ilike.%${safeQ}%,description.ilike.%${safeQ}%,category.ilike.%${safeQ}%,location.ilike.%${safeQ}%`
        );
      }

      // Cursor pagination (only if methods exist)
      if (typeof (query as any).lt === 'function' && typeof (query as any).gt === 'function') {
        if (cursorId && cursorCreatedAt) {
          if (sortOrder === 'desc') {
            query = (query as any).lt('created_at', cursorCreatedAt);
          } else {
            query = (query as any).gt('created_at', cursorCreatedAt);
          }
        }
      }

      // Fetch more results if we need to apply distance filtering or custom sorting
      const fetchLimit = (lat !== null && lng !== null) || sortBy === 'combo' || sortBy === 'relevance'
        ? limit * 3 // Fetch more to filter/sort
        : limit;

      // Basic sorting - we'll apply advanced sorting after fetching
      if (typeof (query as any).limit === 'function') {
        if (interestIds.length > 0) {
          console.log('[BUSINESSES API] Using random sort for interest-filtered results');
          query = (query as any).limit(fetchLimit);
        } else {
          // Apply basic sorting that Supabase supports
          if (typeof (query as any).order === 'function') {
            if (sortBy === 'rating' || sortBy === 'total_rating') {
              // Note: We'll need to sort by business_stats after fetch
              query = (query as any).order('created_at', { ascending: sortOrder === 'asc' });
            } else if (sortBy === 'price') {
              query = (query as any).order('price_range', { ascending: sortOrder === 'asc' });
            } else {
              query = (query as any).order('created_at', { ascending: sortOrder === 'asc' });
            }
          }
          query = (query as any).limit(fetchLimit);
        }
      }

      const { data: fallbackData, error: fallbackError } = await query;
      
      console.log('[BUSINESSES API] Fallback query result:', {
        dataLength: fallbackData?.length || 0,
        hasError: !!fallbackError,
        error: fallbackError ? {
          message: fallbackError.message,
          code: fallbackError.code,
          details: fallbackError.details,
        } : null,
      });
      
      if (fallbackError) {
        console.error('[BUSINESSES API] Fallback query error:', fallbackError);
        // Return 200 with empty array for graceful degradation (RPC not found scenario)
        return NextResponse.json(
          { 
            businesses: [],
            cursorId: null,
          },
          { status: 200 }
        );
      }

      // Transform fallback data to match RPC format with distance calculation
      let transformedFallbackData = (fallbackData || []).map((b: any) => {
        // Calculate distance if lat/lng provided
        let distanceKm: number | null = null;
        if (lat !== null && lng !== null && isValidLatitude(lat) && isValidLongitude(lng)) {
          if (b.lat !== null && b.lng !== null) {
            distanceKm = calculateDistanceKm(lat, lng, b.lat, b.lng);
          }
        }

        return {
          ...b,
          interest_id: b.interest_id,
          sub_interest_id: b.sub_interest_id,
          lat: b.lat,
          lng: b.lng,
          total_reviews: b.business_stats?.[0]?.total_reviews || 0,
          average_rating: b.business_stats?.[0]?.average_rating || 0,
          percentiles: b.business_stats?.[0]?.percentiles || null,
          uploaded_images: b.uploaded_images || [], // Include uploaded_images array
          distance_km: distanceKm,
          cursor_id: b.id,
          cursor_created_at: b.created_at,
        };
      });

      // Apply distance filtering if radius_km is provided
      if (radiusKm !== null && radiusKm > 0 && lat !== null && lng !== null) {
        transformedFallbackData = transformedFallbackData.filter(
          (b) => b.distance_km !== null && b.distance_km <= radiusKm
        );
      }

      // Apply advanced sorting
      if (sortBy === 'distance' && lat !== null && lng !== null) {
        transformedFallbackData.sort((a, b) => {
          const distA = a.distance_km ?? Infinity;
          const distB = b.distance_km ?? Infinity;
          return distA - distB;
        });
      } else if (sortBy === 'rating' || sortBy === 'rating_desc') {
        transformedFallbackData.sort((a, b) => {
          const ratingA = a.average_rating || 0;
          const ratingB = b.average_rating || 0;
          if (ratingA !== ratingB) return ratingB - ratingA;
          return (b.total_reviews || 0) - (a.total_reviews || 0);
        });
      } else if (sortBy === 'price' || sortBy === 'price_asc') {
        transformedFallbackData.sort((a, b) => {
          const priceA = priceRangeToLevel(a.price_range) ?? 999;
          const priceB = priceRangeToLevel(b.price_range) ?? 999;
          if (priceA !== priceB) return priceA - priceB;
          return (b.average_rating || 0) - (a.average_rating || 0);
        });
      } else if (sortBy === 'combo' && lat !== null && lng !== null) {
        transformedFallbackData.forEach((b) => {
          (b as any).combo_score = calculateComboScore(
            b.distance_km,
            b.average_rating,
            priceRangeToLevel(b.price_range)
          );
        });
        transformedFallbackData.sort((a, b) => {
          const scoreA = (a as any).combo_score ?? 0;
          const scoreB = (b as any).combo_score ?? 0;
          return scoreB - scoreA;
        });
      } else if (sortBy === 'relevance' && q) {
        // Relevance sorting: businesses with search matches first
        // This is already handled by textSearch, but we can refine by rating
        transformedFallbackData.sort((a, b) => {
          const ratingA = a.average_rating || 0;
          const ratingB = b.average_rating || 0;
          const reviewsA = a.total_reviews || 0;
          const reviewsB = b.total_reviews || 0;
          // Combine rating and review count for relevance
          const scoreA = ratingA * 2 + Math.log(reviewsA + 1);
          const scoreB = ratingB * 2 + Math.log(reviewsB + 1);
          return scoreB - scoreA;
        });
      }

      // Randomize results when filtering by interests
      if (interestIds && interestIds.length > 0 && transformedFallbackData.length > 0) {
        console.log('[BUSINESSES API] Randomizing results for interest filter');
        // Fisher-Yates shuffle algorithm
        for (let i = transformedFallbackData.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [transformedFallbackData[i], transformedFallbackData[j]] = [transformedFallbackData[j], transformedFallbackData[i]];
        }
      }

      // Apply limit after all filtering and sorting
      transformedFallbackData = transformedFallbackData.slice(0, limit);

      businesses = transformedFallbackData;
    }

    if (error) {
      console.error('[BUSINESSES API] Error fetching businesses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch businesses', details: error.message },
        { status: 500 }
      );
    }

    const typedBusinesses = (businesses || []) as BusinessRPCResult[];

    // Fetch user preferences for personalization
    const userPreferences = await fetchUserPreferences(supabase, userId);
    if (userPreferences.latitude === undefined && lat !== null && lng !== null) {
      userPreferences.latitude = lat;
      userPreferences.longitude = lng;
    }

    // Apply personalization scoring and filtering
    let personalizedBusinesses = typedBusinesses.map((business) => {
      const businessForScoring: BusinessForScoring = {
        id: business.id,
        interest_id: business.interest_id,
        sub_interest_id: business.sub_interest_id,
        category: business.category,
        price_range: business.price_range,
        average_rating: business.average_rating,
        total_reviews: business.total_reviews,
        distance_km: business.distance_km,
        percentiles: business.percentiles,
        verified: business.verified,
        created_at: business.created_at,
        updated_at: business.updated_at,
      };

      const score = calculatePersonalizationScore(businessForScoring, userPreferences);
      
      return {
        ...business,
        personalization_score: score.totalScore,
        personalization_insights: score.insights,
      };
    });

    // Filter out businesses that violate deal breakers (if user has deal breakers)
    if (userPreferences.dealbreakerIds.length > 0) {
      personalizedBusinesses = personalizedBusinesses.filter((business) => {
        const businessForScoring: BusinessForScoring = {
          id: business.id,
          interest_id: business.interest_id,
          sub_interest_id: business.sub_interest_id,
          category: business.category,
          price_range: business.price_range,
          average_rating: business.average_rating,
          total_reviews: business.total_reviews,
          distance_km: business.distance_km,
          percentiles: business.percentiles,
          verified: business.verified,
        };
        
        const filtered = filterBusinessesByDealbreakers([businessForScoring], userPreferences.dealbreakerIds);
        return filtered.length > 0;
      });
    }

    // Sort by personalization score if user has preferences
    if (userPreferences.interestIds.length > 0 || userPreferences.subcategoryIds.length > 0) {
      personalizedBusinesses.sort((a, b) => {
        const scoreA = a.personalization_score || 0;
        const scoreB = b.personalization_score || 0;
        return scoreB - scoreA; // Higher score first
      });
    }

    // Log search history (non-blocking)
    if (userId && q) {
      logSearchHistory(supabase, userId, q, lat, lng, radiusKm, sortParam || null).catch(() => {
        // Silently fail
      });
    }

    console.log(`[BUSINESSES API] Successfully fetched ${personalizedBusinesses.length} businesses`);
    console.log('[BUSINESSES API] Query params:', {
      category, badge, verified, priceRange, location, q, search,
      sortBy, sortOrder, sort: sortParam, limit, cursorId, lat, lng, radiusKm
    });
    if (userPreferences.interestIds.length > 0 || userPreferences.subcategoryIds.length > 0) {
      console.log('[BUSINESSES API] Applied personalization:', {
        interests: userPreferences.interestIds.length,
        subcategories: userPreferences.subcategoryIds.length,
        dealbreakers: userPreferences.dealbreakerIds.length,
      });
    }

    // Transform database format to BusinessCard component format with highlighting
    // Only select fields needed for card display (not full business data)
    const transformedBusinesses = personalizedBusinesses.map((business) => {
      const transformed = transformBusinessForCard(business);
      
      // Add highlighting if search query is present
      if (q) {
        (transformed as any).highlighted_name = highlightText(business.name, q);
        if (business.description) {
          (transformed as any).highlighted_snippet = extractSnippet(business.description, q);
        }
      }
      
      // Add combo_score if present
      if ((business as any).combo_score !== undefined) {
        (transformed as any).combo_score = (business as any).combo_score;
      }
      
      // Add personalization data if present
      if ((business as any).personalization_score !== undefined) {
        (transformed as any).personalization_score = (business as any).personalization_score;
      }
      if ((business as any).personalization_insights !== undefined) {
        (transformed as any).personalization_insights = (business as any).personalization_insights;
      }
      
      return transformed;
    });

    // Get cursor for next page from last item
    const nextCursor = typedBusinesses.length > 0 
      ? {
          cursor_id: typedBusinesses[typedBusinesses.length - 1].cursor_id,
          cursor_created_at: typedBusinesses[typedBusinesses.length - 1].cursor_created_at,
        }
      : null;

    const hasMore = typedBusinesses.length === limit;

    // Get cursor for next page (simplified format for tests)
    const nextCursorId = nextCursor?.cursor_id ?? null;
    
    const response = NextResponse.json({
      businesses: transformedBusinesses,
      cursorId: nextCursorId,
    });
    response.headers.set('X-Feed-Path', 'standard');
    return withDuration(applySharedResponseHeaders(response));

  } catch (error: any) {
    console.error('[BUSINESSES API] Unexpected error:', error);
    console.error('[BUSINESSES API] Error stack:', error?.stack);
    console.error('[BUSINESSES API] Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
    });
    return withDuration(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || String(error),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    ));
  }
}

// GET endpoint for trending/top businesses (uses materialized views)
export async function HEAD(req: Request) {
  try {
    const requestUrl = req?.url ?? `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/businesses`;
    const { searchParams } = new URL(requestUrl);
    const type = searchParams.get('type'); // 'trending', 'top', 'new'
    const category = searchParams.get('category') || null;
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // ✅ Pass request to get cookies for auth
    const supabase = await getServerSupabase(req);

    let data, error;

    // Use pre-computed materialized views for fast access
    switch (type) {
      case 'trending':
        ({ data, error } = await supabase.rpc('get_trending_businesses', {
          p_limit: limit,
          p_category: category,
        }));
        break;

      case 'top':
        ({ data, error } = await supabase.rpc('get_top_rated_businesses', {
          p_limit: limit,
          p_category: category,
        }));
        break;

      case 'new':
        ({ data, error } = await supabase.rpc('get_new_businesses', {
          p_limit: limit,
          p_category: category,
        }));
        break;

      default:
        // Fall back to regular listing
        return GET(req);
    }

    if (error) {
      console.error('[BUSINESSES API] Error fetching special list:', error);
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      );
    }

    // Transform to card format
    const transformedBusinesses = (data || []).map((business: any) => ({
      id: business.id,
      name: business.name,
      image: business.image_url || (business.uploaded_images && business.uploaded_images.length > 0 ? business.uploaded_images[0] : null),
      category: business.category,
      location: business.location,
      rating: business.average_rating > 0 ? Math.round(business.average_rating * 2) / 2 : undefined,
      totalRating: business.average_rating > 0 ? business.average_rating : undefined,
      reviews: business.total_reviews || 0,
      badge: business.verified && business.badge ? business.badge : undefined,
      href: `/business/${business.id}`,
      verified: business.verified || false,
      priceRange: business.price_range || '$$',
      hasRating: business.average_rating > 0,
      percentiles: business.percentiles,
    }));

    const response = NextResponse.json({
      data: transformedBusinesses,
      meta: {
        count: transformedBusinesses.length,
        type,
        category,
      }
    });

    // Cache aggressively for trending/top lists (15 minutes)
    // These are refreshed by cron so can be cached longer
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=900, stale-while-revalidate=1800'
    );

    return response;

  } catch (error) {
    console.error('Error in special businesses list API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ---- Mixed strategy helpers -------------------------------------------------

type MixedFeedOptions = {
  supabase: SupabaseClientInstance;
  limit: number;
  category: string | null;
  badge: string | null;
  verified: boolean | null;
  priceRange: string | null;
  preferredPriceRanges: string[];
  location: string | null;
  minRating: number | null;
  interestIds: string[];
  subInterestIds: string[];
  dealbreakerIds: string[];
  sortBy: string;
  sortOrder: string;
  latitude: number | null;
  longitude: number | null;
  userId?: string | null;
};

// =============================================
// NETFLIX-STYLE TWO-STAGE RECOMMENDER (V2)
// Stage A: Candidate Generation (fast, broad)
// Stage B: Ranking (sophisticated scoring)
// =============================================

async function handleMixedFeedV2(options: MixedFeedOptions) {
  const v2Start = Date.now();
  const {
    supabase,
    limit,
    priceRange,
    preferredPriceRanges,
    interestIds,
    subInterestIds,
    dealbreakerIds,
    latitude,
    longitude,
    userId,
  } = options;

  console.log('[BUSINESSES API] handleMixedFeedV2 (Netflix-style) called with:', {
    limit,
    interestIds: interestIds?.length || 0,
    subInterestIds: subInterestIds?.length || 0,
    dealbreakerIds: dealbreakerIds?.length || 0,
    hasUserId: !!userId,
    hasLocation: !!(latitude && longitude),
  });

  // Derive price filters
  const priceFilters = derivePriceFilters(priceRange, preferredPriceRanges);

  try {
    // Call the V2 recommender RPC
    const rpcPayload = {
      p_user_id: userId || null,
      p_interest_ids: interestIds || [],
      p_sub_interest_ids: subInterestIds || [],
      p_latitude: latitude,
      p_longitude: longitude,
      p_limit: Math.min(limit, 100),
      p_price_ranges: priceFilters && priceFilters.length > 0 ? priceFilters : null,
      p_suppress_recent_hours: userId ? 48 : 0, // Only suppress for logged-in users
    };

    console.log('[BUSINESSES API] Calling recommend_for_you_v2 RPC with:', {
      ...rpcPayload,
      p_interest_ids_count: rpcPayload.p_interest_ids.length,
      p_sub_interest_ids_count: rpcPayload.p_sub_interest_ids.length,
    });

    // Try V2 RPC with explicit error handling
    let rpcData: any[] | null = null;
    let rpcError: any = null;
    const rpcStart = Date.now();

    try {
      const result = await supabase.rpc('recommend_for_you_v2', rpcPayload);
      rpcData = result.data;
      rpcError = result.error;
    } catch (rpcCallError: any) {
      console.log('[BUSINESSES API] V2 RPC duration ms:', Date.now() - rpcStart);
      // RPC function might not exist yet (migrations not run)
      console.warn('[BUSINESSES API] recommend_for_you_v2 RPC call failed:', rpcCallError?.message || rpcCallError);
      console.log('[BUSINESSES API] Falling back to legacy handleMixedFeed (V2 not available)');
      return handleMixedFeedLegacy(options);
    }
    console.log('[BUSINESSES API] V2 RPC duration ms:', Date.now() - rpcStart);

    if (rpcError) {
      console.error('[BUSINESSES API] recommend_for_you_v2 RPC error:', rpcError);
      // Check if it's a "function does not exist" error
      if (rpcError.code === '42883' || rpcError.message?.includes('does not exist')) {
        console.log('[BUSINESSES API] V2 RPC function not found, using legacy handler');
      } else {
        console.log('[BUSINESSES API] Falling back to legacy handleMixedFeed due to RPC error');
      }
      return handleMixedFeedLegacy(options);
    }

    if (!rpcData || rpcData.length === 0) {
      console.log('[BUSINESSES API] V2 RPC returned 0 results, trying legacy fallback');
      return handleMixedFeedLegacy(options);
    }

    console.log('[BUSINESSES API] V2 RPC returned', rpcData.length, 'businesses');

    // Normalize RPC results to BusinessRPCResult format
    const businesses: BusinessRPCResult[] = rpcData.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      interest_id: row.interest_id,
      sub_interest_id: row.sub_interest_id,
      location: row.location,
      address: row.address,
      phone: row.phone,
      email: row.email,
      website: row.website,
      image_url: row.image_url,
      uploaded_images: [], // Images fetched separately from business_images table
      verified: row.verified,
      price_range: row.price_range,
      badge: row.badge,
      slug: row.slug,
      lat: row.lat ?? row.latitude,
      lng: row.lng ?? row.longitude,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_reviews: row.total_reviews || 0,
      average_rating: Number(row.average_rating || 0),
      percentiles: row.percentiles,
      distance_km: null,
      cursor_id: row.id,
      cursor_created_at: row.created_at,
      personalization_score: row.personalization_score,
      diversity_rank: row.diversity_rank,
    }));

    // Apply dealbreaker filtering (client-side for additional safety)
    const filteredBusinesses = filterByDealbreakers(businesses, dealbreakerIds);

    // Fetch business_images for the filtered results
    const businessIds = filteredBusinesses.map(b => b.id);
    if (businessIds.length > 0) {
      const imagesStart = Date.now();
      const { data: imagesData } = await supabase
        .from('business_images')
        .select('business_id, url, type, sort_order, is_primary')
        .in('business_id', businessIds)
        .order('sort_order', { ascending: true });
      console.log('[BUSINESSES API] V2 images query duration ms:', Date.now() - imagesStart);

      if (imagesData) {
        const imagesByBusiness = new Map<string, string[]>();
        for (const img of imagesData) {
          const existing = imagesByBusiness.get(img.business_id) || [];
          existing.push(img.url);
          imagesByBusiness.set(img.business_id, existing);
        }

        // Attach images to businesses
        for (const business of filteredBusinesses) {
          const images = imagesByBusiness.get(business.id);
          if (images && images.length > 0) {
            business.uploaded_images = images;
          }
        }
      }
    }

    // Transform for card display
    const transformedBusinesses = filteredBusinesses.map(transformBusinessForCard);

    console.log('[BUSINESSES API] V2 final transformed businesses:', {
      count: transformedBusinesses.length,
      beforeFilter: businesses.length,
      afterFilter: filteredBusinesses.length,
    });

    // Record impressions for logged-in users (non-blocking)
    if (userId && transformedBusinesses.length > 0) {
      const impressionIds = transformedBusinesses.map(b => b.id);
      // Fire and forget - don't wait for completion
      (async () => {
        try {
          await supabase.rpc('record_reco_impressions', {
            p_user_id: userId,
            p_business_ids: impressionIds,
          });
          console.log('[BUSINESSES API] Recorded', impressionIds.length, 'impressions for user');
        } catch (err: any) {
          console.warn('[BUSINESSES API] Failed to record impressions:', err);
        }
      })();
    }

    const response = NextResponse.json({
      businesses: transformedBusinesses,
      cursorId: null,
    });
    response.headers.set('X-Feed-Path', 'v2');
    console.log('[BUSINESSES API] V2 total duration ms:', Date.now() - v2Start);

    return applySharedResponseHeaders(response);

  } catch (error) {
    console.error('[BUSINESSES API] Error in handleMixedFeedV2:', error);
    // Fallback to legacy handler
    return handleMixedFeedLegacy(options);
  }
}

// Legacy mixed feed handler (kept for fallback)
async function handleMixedFeedLegacy(options: MixedFeedOptions) {
  const legacyStart = Date.now();
  const {
    supabase,
    limit,
    category,
    badge,
    verified,
    priceRange,
    preferredPriceRanges,
    location,
    minRating,
    interestIds,
    subInterestIds,
    dealbreakerIds,
    latitude,
    longitude,
  } = options;

  console.log('[BUSINESSES API] handleMixedFeed called with:', {
    limit,
    category,
    interestIds: interestIds?.length || 0,
    subInterestIds: subInterestIds?.length || 0,
  });

  // =============================================
  // STEP 1: Raw count check (bypasses all filters)
  // =============================================
  const { count: rawCount, error: countError } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  console.log('[BUSINESSES API] Raw active businesses count:', {
    count: rawCount,
    error: countError,
    hasError: !!countError,
  });

  // =============================================
  // STEP 2: If count is 0, test with service role (admin)
  // =============================================
  if (rawCount === 0 || countError) {
    console.warn('[BUSINESSES API] Raw count is 0 or error occurred, testing with service role...');
    
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );

        const { count: adminCount, error: adminError } = await adminClient
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');

        console.log('[BUSINESSES API] Admin (service role) count:', {
          count: adminCount,
          error: adminError,
          hasError: !!adminError,
        });

        if (adminCount && adminCount > 0) {
          console.error('[BUSINESSES API] ⚠️ RLS POLICY ISSUE DETECTED!');
          console.error('[BUSINESSES API] Admin can see', adminCount, 'businesses but public/anonymous cannot.');
          console.error('[BUSINESSES API] This indicates RLS policies are blocking public reads.');
          console.error('[BUSINESSES API] Please check:');
          console.error('[BUSINESSES API]   1. businesses_select_public_and_owners policy exists');
          console.error('[BUSINESSES API]   2. business_stats_select_public policy exists');
          console.error('[BUSINESSES API]   3. business_owners_select_public policy exists');
        }
      } else {
        console.warn('[BUSINESSES API] SUPABASE_SERVICE_ROLE_KEY not set, skipping admin test');
      }
    } catch (adminTestError) {
      console.error('[BUSINESSES API] Error running admin test:', adminTestError);
    }
  }

  const bucketLimit = Math.min(Math.max(limit * 3, limit + 4), 150);
  const priceFilters = derivePriceFilters(priceRange, preferredPriceRanges);

  const bucketsStart = Date.now();
  const [personalMatches, topRated, explore] = await Promise.all([
    fetchPersonalMatches(supabase, {
      limit: bucketLimit,
      category,
      badge,
      verified,
      priceRange,
      preferredPriceRanges: priceFilters,
      location,
      minRating,
      subcategories: subInterestIds,
      interestIds,
      dealbreakerIds,
      latitude,
      longitude,
    }),
    fetchTopRated(supabase, {
      limit: bucketLimit,
      category,
      badge,
      verified,
      priceRange,
      preferredPriceRanges: priceFilters,
      location,
      minRating,
      dealbreakerIds,
    }),
    fetchExplore(supabase, {
      limit: bucketLimit,
      category,
      badge,
      verified,
      priceRange,
      preferredPriceRanges: priceFilters,
      location,
      minRating,
      dealbreakerIds,
    }),
  ]);
  console.log('[BUSINESSES API] Legacy buckets duration ms:', Date.now() - bucketsStart);

  console.log('[BUSINESSES API] Mixed feed buckets:', {
    personalMatches: personalMatches.length,
    topRated: topRated.length,
    explore: explore.length,
    total: personalMatches.length + topRated.length + explore.length,
  });

  const blended = mixBusinesses(personalMatches, topRated, explore, limit);
  
  console.log('[BUSINESSES API] Blended businesses:', {
    blendedCount: blended.length,
    requestedLimit: limit,
    bucketsTotal: personalMatches.length + topRated.length + explore.length,
  });

  // =============================================
  // STEP 3: Check if buckets > 0 but blended = 0
  // =============================================
  const bucketsTotal = personalMatches.length + topRated.length + explore.length;
  if (bucketsTotal > 0 && blended.length === 0) {
    console.warn('[BUSINESSES API] ⚠️ BUCKET MIXING ISSUE DETECTED!');
    console.warn('[BUSINESSES API] Buckets have', bucketsTotal, 'businesses but blended result is empty.');
    console.warn('[BUSINESSES API] This suggests mixBusinesses() is filtering everything out.');
    console.warn('[BUSINESSES API] Sample businesses from buckets:', {
      personalSample: personalMatches[0] ? { id: personalMatches[0].id, name: personalMatches[0].name } : null,
      topRatedSample: topRated[0] ? { id: topRated[0].id, name: topRated[0].name } : null,
      exploreSample: explore[0] ? { id: explore[0].id, name: explore[0].name } : null,
    });
  }
  
  // Prioritize businesses the user has recently reviewed (within 24 hours)
  const prioritizeStart = Date.now();
  const prioritizedBlended = await prioritizeRecentlyReviewedBusinesses(supabase, blended);
  console.log('[BUSINESSES API] Legacy prioritize duration ms:', Date.now() - prioritizeStart);
  
  const transformedBusinesses = prioritizedBlended.map(transformBusinessForCard);

  // =============================================
  // STEP 4: Check if blended > 0 but final = 0
  // =============================================
  if (blended.length > 0 && transformedBusinesses.length === 0) {
    console.warn('[BUSINESSES API] ⚠️ TRANSFORMATION ISSUE DETECTED!');
    console.warn('[BUSINESSES API] Blended has', blended.length, 'businesses but transformed result is empty.');
    console.warn('[BUSINESSES API] This suggests transformBusinessForCard() is dropping all items.');
    console.warn('[BUSINESSES API] Sample business from blended:', {
      id: blended[0].id,
      name: blended[0].name,
      hasUploadedImages: Array.isArray(blended[0].uploaded_images) && blended[0].uploaded_images.length > 0,
      hasImageUrl: !!blended[0].image_url,
    });
  }

  console.log('[BUSINESSES API] Final transformed businesses:', {
    count: transformedBusinesses.length,
    blendedCount: blended.length,
    bucketsTotal,
    sample: transformedBusinesses[0] ? {
      id: transformedBusinesses[0].id,
      name: transformedBusinesses[0].name,
      hasImage: !!transformedBusinesses[0].image,
      hasUploadedImages: Array.isArray(transformedBusinesses[0].uploaded_images) && transformedBusinesses[0].uploaded_images.length > 0,
    } : null,
  });

  // Return in the same format as the standard route for consistency
  const response = NextResponse.json({
    businesses: transformedBusinesses, // Changed from "data" to "businesses" for consistency
    cursorId: null, // Mixed feed doesn't use cursor pagination
  });
  response.headers.set('X-Feed-Path', 'legacy');
  console.log('[BUSINESSES API] Legacy total duration ms:', Date.now() - legacyStart);

  return applySharedResponseHeaders(response);
}

type BucketOptions = {
  limit: number;
  category: string | null;
  badge: string | null;
  verified: boolean | null;
  priceRange: string | null;
  preferredPriceRanges?: string[] | null;
  location: string | null;
  minRating: number | null;
  interestIds?: string[];
  subcategories?: string[];
  dealbreakerIds?: string[];
  latitude?: number | null;
  longitude?: number | null;
};

async function fetchPersonalMatches(
  supabase: SupabaseClientInstance,
  options: BucketOptions
): Promise<BusinessRPCResult[]> {
  // Log exact filters being used
  const filters = {
    category: options.category || null,
    badge: options.badge || null,
    verified: options.verified,
    priceRange: options.priceRange || null,
    preferredPriceRanges: options.preferredPriceRanges || null,
    location: options.location || null,
    minRating: options.minRating || null,
    subcategories: options.subcategories || [],
    interestIds: options.interestIds || [],
    dealbreakerIds: options.dealbreakerIds || [],
    latitude: options.latitude || null,
    longitude: options.longitude || null,
    limit: options.limit,
  };
  console.log('[BUSINESSES API] fetchPersonalMatches filters:', JSON.stringify(filters, null, 2));

  try {
    const priceFilters = derivePriceFilters(options.priceRange, options.preferredPriceRanges || undefined);
    const rpcPayload: Record<string, unknown> = {
      p_user_sub_interest_ids: options.subcategories || [],
      p_user_interest_ids: options.interestIds || [],
      p_limit: Math.min(options.limit, 150),
      p_latitude: options.latitude,
      p_longitude: options.longitude,
      p_price_ranges: priceFilters && priceFilters.length > 0 ? priceFilters : null,
      p_min_rating: options.minRating,
    };

    const { data, error } = await supabase.rpc('recommend_personalized_businesses', rpcPayload);

    if (!error && data) {
      console.log('[BUSINESSES API] fetchPersonalMatches RPC returned', data.length, 'businesses');
      const normalized = (data as any[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        interest_id: row.interest_id,
        sub_interest_id: row.sub_interest_id,
        location: row.location,
        address: row.address,
        phone: row.phone,
        email: row.email,
        website: row.website,
        image_url: row.image_url,
        uploaded_images: row.uploaded_images || [],
        verified: row.verified,
        price_range: row.price_range,
        badge: row.badge,
        slug: row.slug,
        lat: row.lat ?? row.latitude,
        lng: row.lng ?? row.longitude,
        created_at: row.created_at,
        updated_at: row.updated_at,
        total_reviews: row.total_reviews || 0,
        average_rating: Number(row.average_rating || 0),
        percentiles: row.percentiles,
        distance_km: null,
        cursor_id: row.id,
        cursor_created_at: row.created_at,
        personalization_score: row.personalization_score,
        diversity_rank: row.diversity_rank,
      })) as BusinessRPCResult[];

      return filterByDealbreakers(normalized, options.dealbreakerIds);
    }

    if (error && error.code !== '42883') {
      console.error('[BUSINESSES API] recommend_personalized_businesses RPC error:', error);
    }
  } catch (rpcError) {
    console.warn('[BUSINESSES API] Falling back from recommend_personalized_businesses RPC:', rpcError);
  }

  try {
    let query = buildBaseBusinessQuery(supabase);

    if (options.category) {
      query = query.eq('category', options.category);
      console.log('[BUSINESSES API] fetchPersonalMatches: Applied category filter:', options.category);
    } else if (options.subcategories && options.subcategories.length > 0) {
      query = query.in('sub_interest_id', options.subcategories);
      console.log('[BUSINESSES API] fetchPersonalMatches: Applied subcategories filter:', options.subcategories);
    } else if (options.interestIds && options.interestIds.length > 0) {
      query = query.in('interest_id', options.interestIds);
      console.log('[BUSINESSES API] fetchPersonalMatches: Applied interestIds filter:', options.interestIds);
    }

    query = applyCommonFilters(query, options);

    const { data, error } = await query.limit(Math.min(options.limit, 150));

    if (error) {
      console.error('[BUSINESSES API] Personal matches fallback query error:', error);
      return [];
    }

    console.log('[BUSINESSES API] fetchPersonalMatches fallback returned', (data || []).length, 'businesses');

    const normalized = filterByMinRating(normalizeBusinessRows(data || []), options.minRating)
      .sort((a, b) => scorePersonal(b) - scorePersonal(a));
    return filterByDealbreakers(normalized, options.dealbreakerIds);
  } catch (err) {
    console.error('[BUSINESSES API] Personal matches fallback fetch error:', err);
    return [];
  }
}

async function fetchTopRated(
  supabase: SupabaseClientInstance,
  options: BucketOptions
): Promise<BusinessRPCResult[]> {
  // Log exact filters being used
  const filters = {
    category: options.category || null,
    badge: options.badge || null,
    verified: options.verified,
    priceRange: options.priceRange || null,
    preferredPriceRanges: options.preferredPriceRanges || null,
    location: options.location || null,
    minRating: options.minRating || null,
    dealbreakerIds: options.dealbreakerIds || [],
    limit: options.limit,
  };
  console.log('[BUSINESSES API] fetchTopRated filters:', JSON.stringify(filters, null, 2));

  try {
    let query = buildBaseBusinessQuery(supabase);

    if (options.category) {
      query = query.eq('category', options.category);
      console.log('[BUSINESSES API] fetchTopRated: Applied category filter:', options.category);
    }

    query = applyCommonFilters(query, options);

    const { data, error } = await query.limit(Math.min(options.limit, 150));

    if (error) {
      console.error('[BUSINESSES API] Top rated query error:', error);
      return [];
    }

    console.log('[BUSINESSES API] fetchTopRated returned', (data || []).length, 'businesses');

    const normalized = filterByMinRating(normalizeBusinessRows(data || []), options.minRating)
      .sort((a, b) => scoreTopRated(b) - scoreTopRated(a));
    return filterByDealbreakers(normalized, options.dealbreakerIds);
  } catch (err) {
    console.error('[BUSINESSES API] Top rated fetch error:', err);
    return [];
  }
}

async function fetchExplore(
  supabase: SupabaseClientInstance,
  options: BucketOptions
): Promise<BusinessRPCResult[]> {
  // Log exact filters being used
  const filters = {
    category: options.category || null,
    badge: options.badge || null,
    verified: options.verified,
    priceRange: options.priceRange || null,
    preferredPriceRanges: options.preferredPriceRanges || null,
    location: options.location || null,
    minRating: options.minRating || null,
    dealbreakerIds: options.dealbreakerIds || [],
    limit: options.limit,
  };
  console.log('[BUSINESSES API] fetchExplore filters:', JSON.stringify(filters, null, 2));

  try {
    let query = buildBaseBusinessQuery(supabase);

    if (options.category) {
      query = query.eq('category', options.category);
      console.log('[BUSINESSES API] fetchExplore: Applied category filter:', options.category);
    }

    query = applyCommonFilters(query, options);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(Math.min(options.limit, 150));

    if (error) {
      console.error('[BUSINESSES API] Explore query error:', error);
      return [];
    }

    console.log('[BUSINESSES API] fetchExplore returned', (data || []).length, 'businesses');

    const normalized = filterByMinRating(normalizeBusinessRows(data || []), options.minRating)
      .sort((a, b) => scoreExplore(b) - scoreExplore(a));
    return filterByDealbreakers(normalized, options.dealbreakerIds);
  } catch (err) {
    console.error('[BUSINESSES API] Explore fetch error:', err);
    return [];
  }
}

function buildBaseBusinessQuery(supabase: SupabaseClientInstance) {
  return supabase
    .from('businesses')
    .select(BUSINESS_SELECT)
    .eq('status', 'active');
}

function applyCommonFilters(query: any, options: BucketOptions) {
  let updatedQuery = query;

  if (options.badge) {
    updatedQuery = updatedQuery.eq('badge', options.badge);
  }
  if (options.verified !== null && options.verified !== undefined) {
    updatedQuery = updatedQuery.eq('verified', options.verified);
  }
  if (options.preferredPriceRanges && options.preferredPriceRanges.length > 0) {
    updatedQuery = updatedQuery.in('price_range', options.preferredPriceRanges);
  } else if (options.priceRange) {
    updatedQuery = updatedQuery.eq('price_range', options.priceRange);
  }
  if (options.location) {
    updatedQuery = updatedQuery.ilike('location', `%${options.location}%`);
  }

  return updatedQuery;
}

function normalizeBusinessRows(rows: DatabaseBusinessRow[]): BusinessRPCResult[] {
  return rows.map((row) => {
    const stats = row.business_stats?.[0];
    
    // Normalize business_images to uploaded_images format
    const { uploaded_images } = normalizeBusinessImages(row);

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      interest_id: row.interest_id,
      sub_interest_id: row.sub_interest_id,
      location: row.location,
      address: row.address,
      phone: row.phone,
      email: row.email,
      website: row.website,
      image_url: row.image_url,
      uploaded_images: uploaded_images || [],
      verified: row.verified,
      price_range: row.price_range,
      badge: row.badge,
      slug: row.slug,
      lat: row.lat,
      lng: row.lng,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_reviews: stats?.total_reviews || 0,
      average_rating: stats?.average_rating || 0,
      percentiles: stats?.percentiles || null,
      distance_km: null,
      cursor_id: row.id,
      cursor_created_at: row.created_at,
    };
  });
}

function filterByMinRating(
  businesses: BusinessRPCResult[],
  minRating: number | null
): BusinessRPCResult[] {
  if (!minRating) return businesses;
  return businesses.filter((business) => (business.average_rating || 0) >= minRating);
}

function filterByDealbreakers(
  businesses: BusinessRPCResult[],
  dealbreakerIds?: string[]
): BusinessRPCResult[] {
  if (!dealbreakerIds || dealbreakerIds.length === 0) {
    return businesses;
  }

  return businesses.filter((business) =>
    dealbreakerIds.every((id) => {
      const rule = DEALBREAKER_RULES[id];
      if (!rule) return true;
      try {
        return rule(business);
      } catch {
        return true;
      }
    })
  );
}

function derivePriceFilters(
  primary: string | null,
  preferred?: string[] | null
): string[] | undefined {
  const values = new Set<string>();
  preferred?.forEach((value) => {
    if (value) values.add(value);
  });
  if (primary) {
    values.add(primary);
  }
  return values.size > 0 ? Array.from(values) : undefined;
}

function mixBusinesses(
  personalMatches: BusinessRPCResult[],
  topRated: BusinessRPCResult[],
  explore: BusinessRPCResult[],
  limit: number
): BusinessRPCResult[] {
  const result: BusinessRPCResult[] = [];
  const seen = new Set<string>();
  const subInterestCounts = new Map<string, number>();
  const PERSONAL_LIMIT = 2;
  const TOP_LIMIT = 3;

  const buckets = {
    personal: { data: personalMatches, index: 0 },
    top: { data: topRated, index: 0 },
    explore: { data: explore, index: 0 },
  };

  const getSubInterestKey = (business: BusinessRPCResult) =>
    business.sub_interest_id || business.category || 'uncategorized';

  const pushIfNew = (
    business: BusinessRPCResult | undefined,
    bucketKey: keyof typeof buckets,
    allowOverflow = false
  ) => {
    if (!business) return false;
    if (seen.has(business.id)) return false;

    const key = getSubInterestKey(business);
    const limitPerBucket = bucketKey === 'top' ? TOP_LIMIT : PERSONAL_LIMIT;
    const currentCount = subInterestCounts.get(key) || 0;

    if (!allowOverflow && limitPerBucket > 0 && currentCount >= limitPerBucket) {
      return false;
    }

    seen.add(business.id);
    subInterestCounts.set(key, currentCount + 1);
    result.push(business);
    return true;
  };

  const pushFromBucket = (
    bucketKey: keyof typeof buckets,
    allowOverflow = false
  ) => {
    const bucket = buckets[bucketKey];
    while (bucket.index < bucket.data.length) {
      const candidate = bucket.data[bucket.index++];
      if (pushIfNew(candidate, bucketKey, allowOverflow)) return true;
    }
    return false;
  };

  const hasRemaining = () =>
    buckets.personal.index < buckets.personal.data.length ||
    buckets.top.index < buckets.top.data.length ||
    buckets.explore.index < buckets.explore.data.length;

  while (result.length < limit && hasRemaining()) {
    for (let i = 0; i < 2 && result.length < limit; i++) {
      if (!pushFromBucket('personal')) break;
    }

    if (result.length < limit) {
      pushFromBucket('top');
    }

    if (result.length < limit) {
      pushFromBucket('explore');
    }
  }

  for (const key of ['personal', 'top', 'explore'] as const) {
    while (result.length < limit && pushFromBucket(key, true)) {
      // continue filling with relaxed diversity constraints
    }
  }

  return result.slice(0, limit);
}

const DEALBREAKER_RULES: Record<string, (business: BusinessRPCResult) => boolean> = {
  trustworthiness: (business) => business.verified !== false,
  punctuality: (business) => {
    const punctualityScore = business.percentiles?.punctuality ?? 80;
    return punctualityScore >= 70;
  },
  friendliness: (business) => {
    const friendlinessScore = business.percentiles?.friendliness ?? 80;
    return friendlinessScore >= 65;
  },
  'value-for-money': (business) => {
    if (business.price_range) {
      return business.price_range === '$' || business.price_range === '$$';
    }
    const costEffectivenessScore = business.percentiles?.['cost-effectiveness'] ?? 100;
    return costEffectivenessScore >= 75;
  },
};

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

function calculateRecencyBoost(dateString: string | null, multiplier = 1) {
  if (!dateString) return 0;
  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) return 0;
  const days = Math.max((Date.now() - timestamp) / ONE_DAY_MS, 1);
  return multiplier / days;
}

function scorePersonal(business: BusinessRPCResult) {
  const rating = business.average_rating || 0;
  const reviews = Math.log(Math.max(business.total_reviews || 0, 1) + 1);
  const recency = calculateRecencyBoost(business.created_at, 1.2);
  const verifiedBonus = business.verified ? 0.4 : 0;
  const photoBonus = business.image_url || (business.uploaded_images && business.uploaded_images.length > 0) ? 0.2 : 0;
  return rating * 2.2 + reviews + recency + verifiedBonus + photoBonus;
}

function scoreTopRated(business: BusinessRPCResult) {
  const rating = business.average_rating || 0;
  const reviews = Math.log(Math.max(business.total_reviews || 0, 1) + 1.5);
  const verifiedBonus = business.verified ? 0.5 : 0;
  return rating * 2.5 + reviews + verifiedBonus;
}

function scoreExplore(business: BusinessRPCResult) {
  const recency = calculateRecencyBoost(business.created_at, 2.5);
  const lowReviewBoost = (business.total_reviews || 0) < 10 ? 1.2 : 0;
  const ratingSupport = (business.average_rating || 0) * 0.8;
  const photoBonus = business.image_url || (business.uploaded_images && business.uploaded_images.length > 0) ? 0.4 : 0;
  const verifiedBonus = business.verified ? 0.3 : 0;
  return recency + lowReviewBoost + ratingSupport + photoBonus + verifiedBonus;
}

function transformBusinessForCard(business: BusinessRPCResult) {
  const hasRating = business.average_rating && business.average_rating > 0;
  const hasReviews = business.total_reviews && business.total_reviews > 0;
  const shouldShowBadge = business.verified && business.badge;
  const subInterestLabel = business.sub_interest_id ? getSubcategoryLabel(business.sub_interest_id) : undefined;

  // Prioritize first uploaded image over image_url for business cards
  // This ensures owner-uploaded images are displayed first
  const firstUploadedImage = business.uploaded_images && business.uploaded_images.length > 0 
    ? business.uploaded_images[0] 
    : null;
  const displayImage = firstUploadedImage || business.image_url;

  // Log transformation details for debugging
  const transformLog = {
    businessId: business.id,
    businessName: business.name,
    hasRating,
    hasReviews,
    shouldShowBadge,
    hasFirstUploadedImage: !!firstUploadedImage,
    hasImageUrl: !!business.image_url,
    hasDisplayImage: !!displayImage,
    uploadedImagesCount: business.uploaded_images?.length || 0,
    category: business.category,
    status: 'transforming', // Will be set to 'transformed' or 'dropped' below
  };

  // Check if business would be dropped (all conditions that could cause issues)
  const wouldBeDropped = !business.id || !business.name;
  if (wouldBeDropped) {
    transformLog.status = 'dropped';
    console.warn('[BUSINESSES API] transformBusinessForCard: Business would be dropped:', transformLog);
  } else {
    transformLog.status = 'transformed';
  }

  const transformed = {
    id: business.id,
    name: business.name,
    image: displayImage,
    uploaded_images: business.uploaded_images || [], // Include uploaded_images array for BusinessCard component
    image_url: business.image_url || undefined, // Preserve image_url as fallback
    category: subInterestLabel ?? getSubcategoryLabel(business.category) ?? business.category,
    subInterestId: business.sub_interest_id || undefined,
    subInterestLabel,
    interestId: business.interest_id || undefined,
    location: business.location,
    slug: business.slug || undefined,
    lat: business.lat,
    lng: business.lng,
    rating: hasRating ? Math.round(business.average_rating * 2) / 2 : undefined,
    totalRating: hasRating ? business.average_rating : undefined,
    reviews: hasReviews ? business.total_reviews : 0,
    badge: shouldShowBadge ? business.badge : undefined,
    href: `/business/${business.id}`,
    verified: business.verified || false,
    priceRange: business.price_range || '$$',
    distance: business.distance_km,
    hasRating,
    percentiles: business.percentiles
      ? {
          punctuality: business.percentiles.punctuality || 100,
          friendliness: business.percentiles.friendliness || 100,
          trustworthiness: business.percentiles.trustworthiness || 100,
          'cost-effectiveness': business.percentiles['cost-effectiveness'] || 100,
        }
      : undefined,
  };

  // Log successful transformation (only if not dropped)
  if (!wouldBeDropped) {
    console.log('[BUSINESSES API] transformBusinessForCard: Successfully transformed:', {
      ...transformLog,
      finalImage: transformed.image ? 'present' : 'missing',
      uploadedImagesArray: transformed.uploaded_images?.length || 0,
      uploadedImagesSample: transformed.uploaded_images?.slice(0, 2) || [],
    });
  }

  return transformed;
}

/**
 * Prioritize businesses that the user has recently reviewed (within 24 hours)
 * Moves recently reviewed businesses to the front of the array
 */
async function prioritizeRecentlyReviewedBusinesses(
  supabase: SupabaseClientInstance,
  businesses: BusinessRPCResult[]
): Promise<BusinessRPCResult[]> {
  if (!businesses || businesses.length === 0) {
    return businesses;
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return businesses; // No user, return as-is
    }

    // Calculate 24 hours ago timestamp
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Query user's recent reviews within last 24 hours
    const { data: recentReviews, error } = await supabase
      .from('reviews')
      .select('business_id, created_at')
      .eq('user_id', user.id)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (error || !recentReviews || recentReviews.length === 0) {
      return businesses; // No recent reviews or error, return as-is
    }

    // Get unique business IDs from recent reviews (prioritize most recent first)
    const reviewedBusinessIds = [...new Set(recentReviews.map(r => r.business_id))];

    if (reviewedBusinessIds.length === 0) {
      return businesses;
    }

    // Separate businesses into reviewed and non-reviewed
    const reviewedBusinesses: BusinessRPCResult[] = [];
    const nonReviewedBusinesses: BusinessRPCResult[] = [];

    for (const business of businesses) {
      const businessId = business.id;
      const businessSlug = business.slug;
      
      // Check if this business was recently reviewed (by ID or slug)
      const isRecentlyReviewed = reviewedBusinessIds.some(reviewedId => 
        reviewedId === businessId || reviewedId === businessSlug
      );

      if (isRecentlyReviewed) {
        reviewedBusinesses.push(business);
      } else {
        nonReviewedBusinesses.push(business);
      }
    }

    // Sort reviewed businesses by review recency (most recent first)
    reviewedBusinesses.sort((a, b) => {
      const aReview = recentReviews.find(r => r.business_id === a.id || r.business_id === a.slug);
      const bReview = recentReviews.find(r => r.business_id === b.id || r.business_id === b.slug);
      
      if (!aReview) return 1;
      if (!bReview) return -1;
      
      return new Date(bReview.created_at).getTime() - new Date(aReview.created_at).getTime();
    });

    // Return reviewed businesses first, then non-reviewed
    return [...reviewedBusinesses, ...nonReviewedBusinesses];
  } catch (error) {
    console.error('[BUSINESSES API] Error prioritizing recently reviewed businesses:', error);
    return businesses; // Return original order on error
  }
}

/**
 * Find similar businesses in the same category
 * Searches for businesses with matching category, and optionally similar name or location
 */
async function findSimilarBusinesses(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  category: string,
  name: string,
  location?: string | null,
  excludeBusinessId?: string,
  limit: number = 5
): Promise<any[]> {
  try {
    // Validate excludeBusinessId is a valid UUID before using it
    const isValidUUID = excludeBusinessId 
      ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(excludeBusinessId)
      : false;

    // Build query for businesses in the same category
    let query = supabase
      .from('businesses')
      .select(`
        id,
        name,
        category,
        location,
        address,
        slug,
        image_url,
        verified,
        business_stats (
          total_reviews,
          average_rating
        )
      `)
      .eq('category', category)
      .eq('status', 'active')
      .limit(limit + 1); // Get one extra to account for exclusion

    // Exclude the current business if provided and is a valid UUID
    if (excludeBusinessId && isValidUUID) {
      query = query.neq('id', excludeBusinessId);
    }

    const { data: businesses, error } = await query;

    if (error) {
      console.error('[API] Error finding similar businesses:', error);
      return [];
    }

    if (!businesses || businesses.length === 0) {
      return [];
    }

    // Sort by relevance: prioritize businesses with similar names or locations
    const scoredBusinesses = businesses.map(business => {
      let score = 0;

      // Name similarity (case-insensitive partial match)
      const businessNameLower = business.name?.toLowerCase() || '';
      const searchNameLower = name.toLowerCase();
      
      if (businessNameLower.includes(searchNameLower) || searchNameLower.includes(businessNameLower)) {
        score += 10; // Higher score for name similarity
      }

      // Location similarity
      if (location && business.location) {
        const businessLocationLower = business.location.toLowerCase();
        const searchLocationLower = location.toLowerCase();
        if (businessLocationLower.includes(searchLocationLower) || searchLocationLower.includes(businessLocationLower)) {
          score += 5; // Bonus for location match
        }
      }

      // Boost verified businesses
      if (business.verified) {
        score += 2;
      }

      // Boost by rating (if available)
      const avgRating = business.business_stats?.[0]?.average_rating || 0;
      score += avgRating;

      return {
        ...business,
        relevanceScore: score,
      };
    });

    // Sort by relevance score (descending) and return top results
    return scoredBusinesses
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
      .map(({ relevanceScore, ...business }) => business); // Remove score from final result
  } catch (error) {
    console.error('[API] Error in findSimilarBusinesses:', error);
    return [];
  }
}

/**
 * POST /api/businesses
 * Create a new business (requires authentication)
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: 'You need to be logged in to create a business listing. Please sign in and try again.',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Parse request as FormData (to support file uploads, matching review pattern)
    const formData = await req.formData();
    const name = formData.get('name')?.toString();
    const description = formData.get('description')?.toString() || null;
    const category = formData.get('category')?.toString();
    const businessType = formData.get('businessType')?.toString() || null;
    const location = formData.get('location')?.toString();
    const address = formData.get('address')?.toString() || null;
    const phone = formData.get('phone')?.toString() || null;
    const email = formData.get('email')?.toString() || null;
    const website = formData.get('website')?.toString() || null;
    const priceRange = formData.get('priceRange')?.toString() || '$$';
    const hoursRaw = formData.get('hours')?.toString();
    const hours = hoursRaw ? JSON.parse(hoursRaw) : null;
    const latRaw = formData.get('lat')?.toString();
    const lat = latRaw ? parseFloat(latRaw) : null;
    const lngRaw = formData.get('lng')?.toString();
    const lng = lngRaw ? parseFloat(lngRaw) : null;
    
    // Extract image files (following review image pattern)
    const imageFiles = formData
      .getAll('images')
      .filter((file): file is File => file instanceof File && file.size > 0);

    // Validate required fields with specific error messages
    // Location is only required for physical and service-area businesses, not for online-only
    const missingFields: string[] = [];
    if (!name || name.trim().length === 0) {
      missingFields.push('Business name');
    }
    if (!category || category.trim().length === 0) {
      missingFields.push('Category');
    }
    // Location is required only for physical and service-area businesses
    if (businessType !== 'online-only' && (!location || location.trim().length === 0)) {
      missingFields.push('Location');
    }

    if (missingFields.length > 0) {
      const fieldList = missingFields.length === 1 
        ? missingFields[0] 
        : missingFields.length === 2
        ? `${missingFields[0]} and ${missingFields[1]}`
        : `${missingFields.slice(0, -1).join(', ')}, and ${missingFields[missingFields.length - 1]}`;
      
      return NextResponse.json(
        { 
          error: `Please provide ${fieldList.toLowerCase()}. These fields are required to create a business listing.`,
          missingFields,
          code: 'MISSING_REQUIRED_FIELDS'
        },
        { status: 400 }
      );
    }

    // Generate slug from name
    const generateSlug = (businessName: string): string => {
      return businessName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    };

    let slug = generateSlug(name);
    let slugSuffix = 1;
    let finalSlug = slug;

    // Check if slug exists and make it unique
    while (true) {
      const { data: existing } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', finalSlug)
        .single();

      if (!existing) {
        break; // Slug is unique
      }
      finalSlug = `${slug}-${slugSuffix}`;
      slugSuffix++;
    }

    // Create business
    const businessData: any = {
      name: name.trim(),
      description: description?.trim() || null,
      category: category.trim(),
      location: location?.trim() || null, // Can be null for online-only businesses
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      website: website?.trim() || null,
      price_range: priceRange || '$$',
      hours: hours || null,
      owner_id: user.id,
      slug: finalSlug,
      verified: false, // New businesses start unverified
      status: 'active',
      lat: lat || null,
      lng: lng || null,
      // Note: businessType is used for validation but not stored in DB
      // If needed in the future, add a business_type column to the businesses table
    };

    const { data: newBusiness, error: insertError } = await supabase
      .from('businesses')
      .insert(businessData)
      .select()
      .single();

    if (insertError) {
      console.error('[API] Error creating business:', insertError);
      
      // Check for specific database errors
      let errorMessage = 'We couldn\'t create your business listing. Please check your information and try again.';
      let errorCode = 'DATABASE_ERROR';
      
      if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
        errorMessage = 'A business with this name already exists in our system. Please try a different name or check if this business is already listed.';
        errorCode = 'DUPLICATE_BUSINESS';
      } else if (insertError.code === '23503' || insertError.message?.includes('foreign key')) {
        errorMessage = 'There was an issue with the business category. Please select a valid category and try again.';
        errorCode = 'INVALID_CATEGORY';
      } else if (insertError.message) {
        errorMessage = `Unable to save business: ${insertError.message}`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: insertError.message,
          code: errorCode
        },
        { status: 500 }
      );
    }

    // Create business_owners entry

    // Create business_owners entry (use upsert to prevent duplicates)
    const { error: ownerError } = await supabase
      .from('business_owners')
      .upsert({
        business_id: newBusiness.id,
        user_id: user.id,
        role: 'owner',
        verified_at: new Date().toISOString(),
      }, {
        onConflict: 'business_id,user_id'
      });

    if (ownerError) {
      console.error('[API] Error creating business owner:', ownerError);
      // Business was created but owner entry failed - try to clean up
      await supabase.from('businesses').delete().eq('id', newBusiness.id);
      return NextResponse.json(
        { error: 'Failed to assign ownership', details: ownerError.message },
        { status: 500 }
      );
    }

    // Update user profile to business_owner and set account_type
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: 'business_owner',
        account_role: 'business_owner',
        account_type: 'business',
        onboarding_step: 'business_setup', // never 'interests' for business owners
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('[API] Error updating user profile to business_owner:', profileError);
    } else {
      console.log('[API] Successfully updated user profile to business_owner for user:', user.id);
    }

    // Initialize business stats
    await supabase.from('business_stats').insert({
      business_id: newBusiness.id,
      total_reviews: 0,
      average_rating: 0.0,
      rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      percentiles: {},
    });

    // Handle image uploads server-side (following review image pattern)
    const uploadErrors: string[] = [];
    const uploadedImages: any[] = [];

    if (imageFiles.length > 0) {
      // Limit to 10 images max (same as review limit logic)
      const maxImages = Math.min(imageFiles.length, 10);
      
      // Check if business already has a primary image
      const { data: existingPrimary } = await supabase
        .from('business_images')
        .select('id')
        .eq('business_id', newBusiness.id)
        .eq('is_primary', true)
        .limit(1)
        .single();

      for (let i = 0; i < maxImages; i++) {
        const imageFile = imageFiles[i];

        try {
          const fileExt = imageFile.name.split('.').pop() || 'jpg';
          // Path pattern: {business_id}/{timestamp}_{index}.{ext} (matching review pattern)
          const filePath = `${newBusiness.id}/${Date.now()}_${i}.${fileExt}`;

          // Upload to Supabase Storage (server-side)
          const { error: uploadError } = await supabase.storage
            .from('business_images')
            .upload(filePath, imageFile, {
              contentType: imageFile.type,
            });

          if (uploadError) {
            console.error('[API] Error uploading business image:', uploadError);
            uploadErrors.push(`Failed to upload image ${i + 1}: ${uploadError.message}`);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('business_images')
            .getPublicUrl(filePath);

          // Determine if this should be primary (first image only if no primary exists)
          const shouldBePrimary = i === 0 && !existingPrimary;

          // Insert image record into business_images table
          const { data: imageRecord, error: imageError } = await supabase
            .from('business_images')
            .insert({
              business_id: newBusiness.id,
              url: publicUrl,
              type: shouldBePrimary ? 'cover' : 'gallery',
              sort_order: i,
              is_primary: shouldBePrimary,
            })
            .select('id, url, type, sort_order, is_primary, created_at')
            .single();

          if (!imageError && imageRecord) {
            uploadedImages.push(imageRecord);
          } else if (imageError) {
            console.error('[API] Error saving business image record:', imageError);
            uploadErrors.push(`Failed to save image ${i + 1} metadata`);
            // Clean up uploaded file if DB insert failed
            await supabase.storage.from('business_images').remove([filePath]);
          }
        } catch (error) {
          console.error('[API] Error processing business image:', error);
          uploadErrors.push(`Failed to process image ${i + 1}`);
        }
      }
    }

    // Search for similar businesses in the same category
    const similarBusinesses = await findSimilarBusinesses(
      supabase,
      category,
      name,
      location,
      newBusiness.id,
      5 // Limit to 5 similar businesses
    );

    return NextResponse.json({
      success: true,
      business: newBusiness,
      images: uploadedImages,
      message: 'Business created successfully!',
      ...(uploadErrors.length > 0 && { uploadWarnings: uploadErrors }),
      ...(similarBusinesses.length > 0 && { similarBusinesses }),
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error creating business:', error);
    
    let errorMessage = 'We encountered an unexpected error while creating your business listing. Please try again in a moment.';
    let errorCode = 'INTERNAL_ERROR';
    
    if (error.message?.includes('JSON')) {
      errorMessage = 'There was an issue processing your business hours. Please check the format and try again.';
      errorCode = 'INVALID_HOURS_FORMAT';
    } else if (error.message) {
      errorMessage = `Unable to create business: ${error.message}`;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message,
        code: errorCode
      },
      { status: 500 }
    );
  }
}

function applySharedResponseHeaders(response: NextResponse) {
  // Use optimized cache headers for business data
  response.headers.set('Cache-Control', CachePresets.business());
  response.headers.set('ETag', `W/"businesses-${Date.now()}"`);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Vary', 'Accept-Encoding');
  return response;
}

