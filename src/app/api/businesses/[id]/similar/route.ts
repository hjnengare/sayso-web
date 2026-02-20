import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { getCategoryLabelFromBusiness } from '../../../../utils/subcategoryPlaceholders';
import { getInterestIdForSubcategory } from '../../../../lib/onboarding/subcategoryMapping';

const FETCH_TIMEOUT_MS = 1500;
const CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=300';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GET /api/businesses/[id]/similar
 * Returns businesses similar to the target business
 * Uses weighted scoring based on category, subcategory, location, price, and ratings
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessIdentifier } = await params;

    if (!businessIdentifier || businessIdentifier.trim() === '') {
      return NextResponse.json(
        { error: 'Business ID or slug is required' },
        { status: 400 }
      );
    }

    console.log('[API] GET /api/businesses/[id]/similar - Starting request for:', businessIdentifier);
    const supabase = await getServerSupabase(req);

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const radiusKm = parseFloat(searchParams.get('radius_km') || '50.0');

    // Validate limit
    const validLimit = Math.min(Math.max(1, limit), 50); // Between 1 and 50
    const validRadius = Math.min(Math.max(1, radiusKm), 500); // Between 1 and 500 km

    // First, try to resolve business identifier (slug or ID) to actual ID
    let targetBusinessId: string | null = null;

    // Try slug first (using maybeSingle to avoid errors when not found)
    const { data: slugData, error: slugError } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', businessIdentifier)
      .eq('status', 'active')
      .or('is_hidden.is.null,is_hidden.eq.false')
      .or('is_system.is.null,is_system.eq.false')
      .maybeSingle();

    if (slugError) {
      console.error('[API] Error checking slug:', slugError);
      // Continue to try ID lookup even if slug query fails
    } else if (slugData?.id) {
      targetBusinessId = slugData.id;
    } else {
      // Assume it's an ID (UUID format)
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(businessIdentifier)) {
        // Check if business exists (using maybeSingle to avoid errors when not found)
        const { data: idData, error: idError } = await supabase
          .from('businesses')
          .select('id')
          .eq('id', businessIdentifier)
          .eq('status', 'active')
          .or('is_hidden.is.null,is_hidden.eq.false')
          .or('is_system.is.null,is_system.eq.false')
          .maybeSingle();

        if (idError) {
          console.error('[API] Error checking ID:', idError);
        } else if (idData?.id) {
          targetBusinessId = businessIdentifier;
        }
      }
    }

    if (!targetBusinessId) {
      console.log('[API] Business not found for identifier:', businessIdentifier);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Validate that targetBusinessId is a valid UUID before calling RPC
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetBusinessId)) {
      console.error('[API] Invalid UUID format for targetBusinessId:', targetBusinessId);
      return NextResponse.json(
        { error: 'Invalid business identifier format' },
        { status: 400 }
      );
    }

    console.log('[API] Calling get_similar_businesses RPC with:', {
      targetBusinessId,
      limit: validLimit,
      radius_km: validRadius,
    });

    // Fetch target coords to compute distance client-side (RPC doesn't currently return distance).
    const { data: targetCoords } = await withTimeout(
      supabase
        .from('businesses')
        .select('lat, lng')
        .eq('id', targetBusinessId)
        .or('is_hidden.is.null,is_hidden.eq.false')
        .or('is_system.is.null,is_system.eq.false')
        .maybeSingle(),
      FETCH_TIMEOUT_MS,
      'similar:target-coords'
    );

    const targetLat = (targetCoords as any)?.lat as number | null | undefined;
    const targetLng = (targetCoords as any)?.lng as number | null | undefined;

    // Call the RPC function
    const { data: similarBusinesses, error: rpcError } = await withTimeout(
      supabase.rpc('get_similar_businesses', {
        p_target_business_id: targetBusinessId,
        p_limit: validLimit,
        p_radius_km: validRadius,
      }),
      FETCH_TIMEOUT_MS,
      'similar:rpc'
    );

    if (rpcError) {
      console.error('[API] Error calling get_similar_businesses RPC:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      
      // If RPC doesn't exist, return empty array (graceful degradation)
      if (
        rpcError.code === '42883' || // function does not exist
        rpcError.code === 'PGRST301' || // PostgREST: function not found
        rpcError.message?.toLowerCase().includes('function') || 
        rpcError.message?.toLowerCase().includes('does not exist') ||
        rpcError.message?.toLowerCase().includes('could not find') ||
        rpcError.message?.toLowerCase().includes('unknown function')
      ) {
        console.warn('[API] get_similar_businesses RPC function not found. Please run the migration: supabase/migrations/20250122_create_get_similar_businesses_function.sql');
        const res = NextResponse.json({ businesses: [] });
        res.headers.set('Cache-Control', CACHE_CONTROL);
        res.headers.set('X-Query-Duration-MS', String(Date.now() - start));
        return res;
      }

      // In development, expose full error details for debugging
      const isDev = process.env.NODE_ENV === 'development';
      return NextResponse.json(
        {
          error: 'Failed to fetch similar businesses',
          details: rpcError.message,
          code: rpcError.code,
          ...(isDev && {
            rpcError: {
              code: rpcError.code,
              message: rpcError.message,
              details: rpcError.details,
              hint: rpcError.hint,
            },
            params: { targetBusinessId, validLimit, validRadius },
          }),
        },
        { status: 500 }
      );
    }

    const nonSystemBusinesses = (similarBusinesses || []).filter((business: any) => 
      business?.is_system !== true && business?.is_hidden !== true
    );

    if (nonSystemBusinesses.length === 0) {
      return NextResponse.json({ businesses: [] });
    }

    // Transform the results to match BusinessCard component format
    // RPC returns primary_subcategory_slug, primary_category_slug, primary_subcategory_label (no legacy category/sub_interest_id/interest_id)
    const transformedBusinesses = nonSystemBusinesses.map((business: any) => {
      const hasRating = business.average_rating && business.average_rating > 0;
      const hasReviews = business.total_reviews && business.total_reviews > 0;
      const shouldShowBadge = business.verified && business.badge;
      const categorySlug = business.primary_subcategory_slug ?? business.category;
      const categoryLabel =
        business.primary_subcategory_label ??
        getCategoryLabelFromBusiness({ ...business, category: categorySlug, category_label: business.primary_subcategory_label });

      // Prioritize first uploaded image over image_url
      const firstUploadedImage = business.uploaded_images && business.uploaded_images.length > 0 
        ? business.uploaded_images[0] 
        : null;
      const displayImage = firstUploadedImage || business.image_url;

      // Use slug for URL if available, fallback to ID
      const businessIdentifier = business.slug || business.id;
      const href = `/business/${businessIdentifier}`;

      const interestId =
        business.primary_category_slug ??
        business.interest_id ??
        (categorySlug ? getInterestIdForSubcategory(categorySlug) : undefined);

      const latitude = (business.latitude ?? business.lat) as number | null | undefined;
      const longitude = (business.longitude ?? business.lng) as number | null | undefined;
      const distance_km =
        typeof targetLat === 'number' &&
        typeof targetLng === 'number' &&
        typeof latitude === 'number' &&
        typeof longitude === 'number'
          ? Math.round(calculateDistanceKm(targetLat, targetLng, latitude, longitude) * 10) / 10
          : undefined;

      return {
        id: business.id,
        name: business.name,
        image: displayImage,
        uploaded_images: business.uploaded_images || [],
        image_url: business.image_url || undefined,
        category: categorySlug ?? undefined,
        category_label: categoryLabel,
        sub_interest_id: categorySlug ?? undefined,
        subInterestId: categorySlug ?? undefined,
        subInterestLabel: categoryLabel !== 'Miscellaneous' ? categoryLabel : undefined,
        interestId,
        location: business.location,
        address: business.address || undefined,
        description: business.description || undefined,
        latitude,
        longitude,
        distance_km,
        rating: hasRating ? Math.round(business.average_rating * 2) / 2 : undefined,
        totalRating: hasRating ? business.average_rating : undefined,
        reviews: hasReviews ? business.total_reviews : 0,
        badge: shouldShowBadge ? business.badge : undefined,
        href,
        verified: business.verified || false,
        priceRange: business.price_range || '$$',
        hasRating,
        percentiles: business.percentiles
          ? {
              punctuality: business.percentiles.punctuality || 100,
              friendliness: business.percentiles.friendliness || 100,
              trustworthiness: business.percentiles.trustworthiness || 100,
              'cost-effectiveness': business.percentiles['cost-effectiveness'] || 100,
            }
          : undefined,
        // Include similarity score for debugging/analytics (optional)
        similarity_score: business.similarity_score,
      };
    });

    // Set cache headers (1 hour revalidation, can be stale for up to 1 day)
    const response = NextResponse.json({
      businesses: transformedBusinesses,
    });
    response.headers.set('Cache-Control', CACHE_CONTROL);
    response.headers.set('X-Query-Duration-MS', String(Date.now() - start));
    return response;
  } catch (error: any) {
    console.error('[API] Error in GET similar businesses:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    });
    
    // If it's an RPC-related error, try to return empty array gracefully
    if (error?.message?.toLowerCase().includes('function') || 
        error?.message?.toLowerCase().includes('rpc') ||
        error?.code === '42883' ||
        error?.code === 'PGRST301') {
      console.warn('[API] RPC function error detected, returning empty array. Please run migration: supabase/migrations/20250122_create_get_similar_businesses_function.sql');
      const res = NextResponse.json({ businesses: [] });
      res.headers.set('Cache-Control', CACHE_CONTROL);
      res.headers.set('X-Query-Duration-MS', String(Date.now() - start));
      return res;
    }
    
    const res = NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
    res.headers.set('Cache-Control', CACHE_CONTROL);
    res.headers.set('X-Query-Duration-MS', String(Date.now() - start));
    return res;
  }
}


