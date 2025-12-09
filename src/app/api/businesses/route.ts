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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Use Node.js runtime to avoid Edge Runtime warnings with Supabase

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
  uploaded_image: string | null;
  verified: boolean;
  price_range: string;
  badge: string | null;
  slug: string;
  latitude: number | null;
  longitude: number | null;
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
  phone, email, website, image_url, uploaded_image,
  verified, price_range, badge, slug, latitude, longitude,
  created_at, updated_at,
  business_stats (
    total_reviews, average_rating, percentiles
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
  uploaded_image: string | null;
  verified: boolean;
  price_range: string;
  badge: string | null;
  slug: string;
  latitude: number | null;
  longitude: number | null;
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

export async function GET(req: Request) {
  try {
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
    
    // Map interests to subcategories
    let subcategoriesToFilter: string[] = [];
    if (interestIds.length > 0) {
      for (const interestId of interestIds) {
        const subcats = INTEREST_TO_SUBCATEGORIES[interestId];
        if (subcats) {
          subcategoriesToFilter.push(...subcats);
        }
      }
    }
    console.log('[BUSINESSES API] Mapped interests to subcategories:', {
      interests: interestIds,
      subcategories: subcategoriesToFilter,
    });

    // Enhanced search parameters
    // Support both 'q' (new) and 'search' (backward compatible)
    const q = searchParams.get('q') || searchParams.get('search') || null;
    const search = q; // Keep for backward compatibility

    // Enhanced location parameters
    // Support both 'lat'/'lng' (new) and existing 'lat'/'lng' params
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const lat = latParam ? parseFloat(latParam) : null;
    const lng = lngParam ? parseFloat(lngParam) : null;
    const radiusKm = searchParams.get('radius_km') ? parseFloat(searchParams.get('radius_km')!) : null;

    // Enhanced sorting parameters
    // New 'sort' param: 'relevance', 'distance', 'rating_desc', 'price_asc', 'combo'
    // Backward compatible with 'sort_by' and 'sort_order'
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

    // Get user ID from auth for search history (more secure than query param)
    const supabase = await getServerSupabase();
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Silently fail - search history is optional
      userId = null;
    }
    const preferredPriceRanges = searchParams.get('preferred_price_ranges')
      ? searchParams.get('preferred_price_ranges')!.split(',').map(range => range.trim()).filter(Boolean)
      : [];
    const dealbreakerIds = searchParams.get('dealbreakers')
      ? searchParams.get('dealbreakers')!.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    const feedStrategy = (searchParams.get('feed_strategy') as 'mixed' | 'standard' | null) || 'standard';

    // Legacy location parameters (keep for backward compatibility)
    const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : (radiusKm || 10);

    if (feedStrategy === 'mixed') {
      return await handleMixedFeed({
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
        subInterestIds: subcategoriesToFilter,
        dealbreakerIds,
        sortBy,
        sortOrder,
        latitude: lat,
        longitude: lng,
      });
    }

    // Try to use the optimized RPC function for listing, fallback to regular query
    let businesses: BusinessRPCResult[] | null = null;
    let error: any = null;

    // Check if RPC function exists, if not fallback to regular query
    try {
      const { data, error: rpcError } = await supabase.rpc('list_businesses_optimized', {
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
      });

      if (rpcError && rpcError.code === '42883') {
        // RPC function doesn't exist, use fallback
        console.log('[BUSINESSES API] RPC function not found, using fallback query');
        throw new Error('RPC not found');
      }

      // Calculate distance for RPC results if lat/lng provided
      if (lat !== null && lng !== null && isValidLatitude(lat) && isValidLongitude(lng)) {
        businesses = (data as BusinessRPCResult[]).map((b) => {
          if (b.latitude !== null && b.longitude !== null) {
            b.distance_km = calculateDistanceKm(lat, lng, b.latitude, b.longitude);
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
        businesses = data as BusinessRPCResult[];
      }
      error = rpcError;
    } catch (rpcError: any) {
      // Fallback to regular query if RPC doesn't exist
      console.log('[BUSINESSES API] Using fallback query method');
      
      let query = supabase
        .from('businesses')
        .select(`
          id, name, description, category, interest_id, sub_interest_id, location, address, 
          phone, email, website, image_url, uploaded_image,
          verified, price_range, badge, slug, created_at, updated_at,
          business_stats (
            total_reviews, average_rating, percentiles
          )
        `)
        .eq('status', 'active');

      // Apply filters
      if (category) query = query.eq('category', category);
      // Interest-based filtering: filter by subcategories mapped from interests
      else if (subcategoriesToFilter && subcategoriesToFilter.length > 0) {
        console.log('[BUSINESSES API] Filtering by mapped subcategories:', subcategoriesToFilter);
        query = query.in('category', subcategoriesToFilter);
      }
      
      if (badge) query = query.eq('badge', badge);
      if (verified !== null) query = query.eq('verified', verified);
      if (priceRange) query = query.eq('price_range', priceRange);
      if (location) query = query.ilike('location', `%${location}%`);
      // Enhanced full-text search
      if (q) {
        query = query.textSearch('search_vector', q, {
          type: 'websearch',
          config: 'english'
        });
      }

      // Cursor pagination
      if (cursorId && cursorCreatedAt) {
        if (sortOrder === 'desc') {
          query = query.lt('created_at', cursorCreatedAt);
        } else {
          query = query.gt('created_at', cursorCreatedAt);
        }
      }

      // Fetch more results if we need to apply distance filtering or custom sorting
      const fetchLimit = (lat !== null && lng !== null) || sortBy === 'combo' || sortBy === 'relevance'
        ? limit * 3 // Fetch more to filter/sort
        : limit;

      // Basic sorting - we'll apply advanced sorting after fetching
      if (interestIds.length > 0) {
        console.log('[BUSINESSES API] Using random sort for interest-filtered results');
        query = query.limit(fetchLimit);
      } else {
        // Apply basic sorting that Supabase supports
        if (sortBy === 'rating' || sortBy === 'total_rating') {
          // Note: We'll need to sort by business_stats after fetch
          query = query.order('created_at', { ascending: sortOrder === 'asc' });
        } else if (sortBy === 'price') {
          query = query.order('price_range', { ascending: sortOrder === 'asc' });
        } else {
          query = query.order('created_at', { ascending: sortOrder === 'asc' });
        }
        query = query.limit(fetchLimit);
      }

      const { data: fallbackData, error: fallbackError } = await query;
      
      if (fallbackError) {
        console.error('[BUSINESSES API] Fallback query error:', fallbackError);
        return NextResponse.json(
          { 
            error: 'Failed to fetch businesses',
            details: fallbackError.message,
            hint: fallbackError.hint,
            code: fallbackError.code,
          },
          { status: 500 }
        );
      }

      // Transform fallback data to match RPC format with distance calculation
      let transformedFallbackData = (fallbackData || []).map((b: any) => {
        // Calculate distance if lat/lng provided
        let distanceKm: number | null = null;
        if (lat !== null && lng !== null && isValidLatitude(lat) && isValidLongitude(lng)) {
          if (b.latitude !== null && b.longitude !== null) {
            distanceKm = calculateDistanceKm(lat, lng, b.latitude, b.longitude);
          }
        }

        return {
          ...b,
          interest_id: b.interest_id,
          sub_interest_id: b.sub_interest_id,
          latitude: b.latitude,
          longitude: b.longitude,
          total_reviews: b.business_stats?.[0]?.total_reviews || 0,
          average_rating: b.business_stats?.[0]?.average_rating || 0,
          percentiles: b.business_stats?.[0]?.percentiles || null,
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

    // Log search history (non-blocking)
    if (userId && q) {
      logSearchHistory(supabase, userId, q, lat, lng, radiusKm, sortParam || null).catch(() => {
        // Silently fail
      });
    }

    console.log(`[BUSINESSES API] Successfully fetched ${typedBusinesses.length} businesses`);
    console.log('[BUSINESSES API] Query params:', {
      category, badge, verified, priceRange, location, q, search,
      sortBy, sortOrder, sort: sortParam, limit, cursorId, lat, lng, radiusKm
    });

    // Transform database format to BusinessCard component format with highlighting
    // Only select fields needed for card display (not full business data)
    const transformedBusinesses = typedBusinesses.map((business) => {
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

    const response = NextResponse.json({
      data: transformedBusinesses,
      meta: {
        count: transformedBusinesses.length,
        limit,
        hasMore,
        nextCursor,
      }
    });
    return applySharedResponseHeaders(response);

  } catch (error) {
    console.error('Error in businesses API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    const supabase = await getServerSupabase();

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
      image: business.image_url || business.uploaded_image,
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
};

async function handleMixedFeed(options: MixedFeedOptions) {
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

  const bucketLimit = Math.min(Math.max(limit * 3, limit + 4), 150);
  const priceFilters = derivePriceFilters(priceRange, preferredPriceRanges);

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

  const blended = mixBusinesses(personalMatches, topRated, explore, limit);
  
  // Prioritize businesses the user has recently reviewed (within 24 hours)
  const prioritizedBlended = await prioritizeRecentlyReviewedBusinesses(supabase, blended);
  
  const transformedBusinesses = prioritizedBlended.map(transformBusinessForCard);

  const response = NextResponse.json({
    data: transformedBusinesses,
    meta: {
      count: transformedBusinesses.length,
      limit,
      strategy: 'mixed',
      buckets: {
        personalMatches: personalMatches.length,
        topRated: topRated.length,
        explore: explore.length,
      },
    },
  });

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
        uploaded_image: row.uploaded_image,
        verified: row.verified,
        price_range: row.price_range,
        badge: row.badge,
        slug: row.slug,
        latitude: row.latitude,
        longitude: row.longitude,
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
    } else if (options.subcategories && options.subcategories.length > 0) {
      query = query.in('sub_interest_id', options.subcategories);
    } else if (options.interestIds && options.interestIds.length > 0) {
      query = query.in('interest_id', options.interestIds);
    }

    query = applyCommonFilters(query, options);

    const { data, error } = await query.limit(Math.min(options.limit, 150));

    if (error) {
      console.error('[BUSINESSES API] Personal matches fallback query error:', error);
      return [];
    }

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
  try {
    let query = buildBaseBusinessQuery(supabase);

    if (options.category) {
      query = query.eq('category', options.category);
    }

    query = applyCommonFilters(query, options);

    const { data, error } = await query.limit(Math.min(options.limit, 150));

    if (error) {
      console.error('[BUSINESSES API] Top rated query error:', error);
      return [];
    }

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
  try {
    let query = buildBaseBusinessQuery(supabase);

    if (options.category) {
      query = query.eq('category', options.category);
    }

    query = applyCommonFilters(query, options);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(Math.min(options.limit, 150));

    if (error) {
      console.error('[BUSINESSES API] Explore query error:', error);
      return [];
    }

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
      uploaded_image: row.uploaded_image,
      verified: row.verified,
      price_range: row.price_range,
      badge: row.badge,
      slug: row.slug,
      latitude: row.latitude,
      longitude: row.longitude,
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
    const costEffectivenessScore = business.percentiles?.['cost-effectiveness'] ?? 85;
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
  const photoBonus = business.image_url || business.uploaded_image ? 0.2 : 0;
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
  const photoBonus = business.image_url || business.uploaded_image ? 0.4 : 0;
  const verifiedBonus = business.verified ? 0.3 : 0;
  return recency + lowReviewBoost + ratingSupport + photoBonus + verifiedBonus;
}

function transformBusinessForCard(business: BusinessRPCResult) {
  const hasRating = business.average_rating && business.average_rating > 0;
  const hasReviews = business.total_reviews && business.total_reviews > 0;
  const shouldShowBadge = business.verified && business.badge;
  const subInterestLabel = formatSubInterestLabel(business.sub_interest_id);

  return {
    id: business.id,
    name: business.name,
    image: business.image_url || business.uploaded_image,
    category: business.category,
    subInterestId: business.sub_interest_id || undefined,
    subInterestLabel,
    interestId: business.interest_id || undefined,
    location: business.location,
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
          punctuality: business.percentiles.punctuality || 85,
          friendliness: business.percentiles.friendliness || 85,
          trustworthiness: business.percentiles.trustworthiness || 85,
          'cost-effectiveness': business.percentiles['cost-effectiveness'] || 85,
        }
      : undefined,
  };
}

function formatSubInterestLabel(subInterestId?: string | null) {
  if (!subInterestId) return undefined;
  return subInterestId
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
        { error: 'Unauthorized. Please log in to create a business.' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      name,
      description,
      category,
      location,
      address,
      phone,
      email,
      website,
      priceRange,
      hours,
      lat,
      lng,
    } = body;

    // Validate required fields
    if (!name || !category || !location) {
      return NextResponse.json(
        { error: 'Name, category, and location are required' },
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
      location: location.trim(),
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
    };

    const { data: newBusiness, error: insertError } = await supabase
      .from('businesses')
      .insert(businessData)
      .select()
      .single();

    if (insertError) {
      console.error('[API] Error creating business:', insertError);
      return NextResponse.json(
        { error: 'Failed to create business', details: insertError.message },
        { status: 500 }
      );
    }

    // Create business_owners entry
    const { error: ownerError } = await supabase
      .from('business_owners')
      .insert({
        business_id: newBusiness.id,
        user_id: user.id,
        role: 'owner',
        verified_at: new Date().toISOString(),
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

    // Initialize business stats
    await supabase.from('business_stats').insert({
      business_id: newBusiness.id,
      total_reviews: 0,
      average_rating: 0.0,
      rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      percentiles: {},
    });

    return NextResponse.json({
      success: true,
      business: newBusiness,
      message: 'Business created successfully!',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error creating business:', error);
    return NextResponse.json(
      { error: 'Failed to create business', details: error.message },
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
