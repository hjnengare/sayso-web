import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { normalizeBusinessImages } from "@/app/lib/utils/businessImages";
import type { 
  CuratedBusiness, 
  CuratedBusinessesResponse, 
  CuratedBusinessUI, 
  CuratedBusinessesUIResponse 
} from "@/app/lib/types/curation";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory cache for curated results (5-minute TTL)
const cache = new Map<string, { data: CuratedBusinessesUIResponse; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(interestId: string | null, lat: number | null, lng: number | null): string {
  // Round lat/lng to 2 decimal places for cache bucketing (~1km precision)
  const roundedLat = lat !== null ? Math.round(lat * 100) / 100 : 'null';
  const roundedLng = lng !== null ? Math.round(lng * 100) / 100 : 'null';
  return `${interestId || 'all'}_${roundedLat}_${roundedLng}`;
}

/**
 * Fallback: fetch curated businesses using direct query when RPC doesn't exist
 */
async function getCuratedFallback(
  supabase: any, 
  interestId: string | null, 
  limit: number
): Promise<CuratedBusiness[]> {
  console.log('[CURATED API] Using fallback query (RPC not available)');

  // Build query
  let query = supabase
    .from('businesses')
    .select(`
      id,
      name,
      image_url,
      category,
      sub_interest_id,
      interest_id,
      description,
      location,
      lat,
      lng,
      verified,
      owner_verified,
      slug,
      last_activity_at,
      created_at,
      business_stats (
        average_rating,
        total_reviews
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit * 2);

  // Apply interest filter if specified
  if (interestId) {
    query = query.or(`interest_id.eq.${interestId},sub_interest_id.eq.${interestId},category.eq.${interestId}`);
  }

  const { data: businesses, error } = await query;

  if (error) {
    console.error('[CURATED API] Fallback query error:', error);
    return [];
  }

  if (!businesses || businesses.length === 0) {
    return [];
  }

  // Simple scoring for fallback
  const scored = businesses.map((b: any) => {
    const stats = b.business_stats?.[0] || b.business_stats || {};
    const avgRating = stats.average_rating || 0;
    const totalReviews = stats.total_reviews || 0;
    
    // Simple Bayesian adjustment
    const priorMean = 4.0;
    const priorWeight = 5;
    const weightedRating = (avgRating * totalReviews + priorMean * priorWeight) / (totalReviews + priorWeight);
    
    // Simple score: weighted rating + log(reviews)
    const score = weightedRating * 0.7 + Math.log(1 + totalReviews) * 0.3;
    
    return {
      id: b.id,
      name: b.name,
      image_url: b.image_url || '',
      category: b.category,
      sub_interest_id: b.sub_interest_id,
      interest_id: b.interest_id,
      description: b.description,
      location: b.location,
      lat: b.lat,
      lng: b.lng,
      average_rating: avgRating,
      total_reviews: totalReviews,
      verified: b.verified || false,
      owner_verified: b.owner_verified || false,
      slug: b.slug,
      last_activity_at: b.last_activity_at,
      created_at: b.created_at,
      curation_score: score,
      is_top3: false,
      rank_position: 0,
    };
  });

  // Sort by score
  scored.sort((a: any, b: any) => b.curation_score - a.curation_score);

  // Mark top 3 and assign ranks
  return scored.slice(0, limit).map((b: any, index: number) => ({
    ...b,
    is_top3: index < 3,
    rank_position: index + 1,
  }));
}

/**
 * Transform raw curated business to UI format
 */
function transformToUI(
  business: CuratedBusiness, 
  businessImages: { [key: string]: any[] }
): CuratedBusinessUI {
  const images = businessImages[business.id] || [];
  const primaryImage = images.find((img: any) => img.is_primary) || images[0];
  const displayCategory = business.sub_interest_id || business.category || 'Miscellaneous';

  return {
    id: business.id,
    name: business.name,
    image: primaryImage?.url || business.image_url || '',
    alt: primaryImage?.alt_text || business.name,
    category: displayCategory,
    description: business.description || `${business.is_top3 ? 'Top rated' : 'Featured'} in ${displayCategory}`,
    location: business.location || 'Cape Town',
    rating: business.average_rating > 0 ? 5 : 0, // UI expects 0 or 5 for star display
    reviewCount: business.total_reviews,
    totalRating: business.average_rating,
    reviews: business.total_reviews,
    badge: business.is_top3 ? "top3" : "curated",
    rank: business.rank_position,
    href: `/business/${business.slug || business.id}`,
    monthAchievement: business.is_top3 
      ? `#${business.rank_position} in ${displayCategory}` 
      : `Featured ${displayCategory}`,
    verified: business.verified || business.owner_verified,
    isTop3: business.is_top3,
    curationScore: business.curation_score,
  };
}

/**
 * GET /api/curated
 * Returns curated businesses with top3 and next10 structure
 * 
 * Query params:
 * - interest_id: Filter by interest (optional, null = all interests)
 * - limit: Total businesses to return (default 13 = 3 + 10)
 * - lat: User latitude for distance boost (optional)
 * - lng: User longitude for distance boost (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { searchParams } = new URL(request.url);

    const interestId = searchParams.get('interest_id')?.trim() || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '13'), 50);
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;

    // Check cache
    const cacheKey = getCacheKey(interestId, userLat, userLng);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log('[CURATED API] Returning cached result');
      return NextResponse.json(cached.data);
    }

    let curatedData: CuratedBusiness[] = [];
    let useRpc = true;

    // Try RPC first
    try {
      const { data, error } = await supabase
        .rpc('get_curated_businesses', {
          p_interest_id: interestId,
          p_limit: limit,
          p_user_lat: userLat,
          p_user_lng: userLng,
        });

      if (error) {
        console.warn('[CURATED API] RPC error, using fallback:', error.message);
        useRpc = false;
      } else {
        curatedData = (data || []) as CuratedBusiness[];
      }
    } catch (rpcError: any) {
      console.warn('[CURATED API] RPC call failed, using fallback:', rpcError?.message);
      useRpc = false;
    }

    // Use fallback if RPC failed or returned no data
    if (!useRpc || curatedData.length === 0) {
      curatedData = await getCuratedFallback(supabase, interestId, limit);
    }

    if (!curatedData || curatedData.length === 0) {
      const emptyResponse: CuratedBusinessesUIResponse = {
        top3: [],
        next10: [],
        interestId,
        totalCount: 0,
      };
      return NextResponse.json(emptyResponse);
    }

    // Get business images for all curated businesses
    const businessIds = curatedData.map((b) => b.id);
    const { data: imagesData } = await supabase
      .from('business_images')
      .select('business_id, url, alt_text, is_primary')
      .in('business_id', businessIds)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    // Normalize images by business ID
    const normalizedImages = normalizeBusinessImages(imagesData || []) as unknown as { [key: string]: any[] };

    // Transform to UI format and split into top3/next10
    const top3: CuratedBusinessUI[] = [];
    const next10: CuratedBusinessUI[] = [];

    for (const business of curatedData) {
      const uiBusiness = transformToUI(business, normalizedImages);
      if (business.is_top3) {
        top3.push(uiBusiness);
      } else {
        next10.push(uiBusiness);
      }
    }

    // Sort by rank within each group
    top3.sort((a, b) => a.rank - b.rank);
    next10.sort((a, b) => a.rank - b.rank);

    const response: CuratedBusinessesUIResponse = {
      top3,
      next10,
      interestId,
      totalCount: curatedData.length,
    };

    // Cache the result
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    // Clean up old cache entries periodically
    if (cache.size > 100) {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL_MS) {
          cache.delete(key);
        }
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[CURATED API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
