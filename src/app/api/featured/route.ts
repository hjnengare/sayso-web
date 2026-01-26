import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { normalizeBusinessImages } from "@/app/lib/utils/businessImages";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Fallback: fetch top-rated businesses directly when RPC doesn't exist
 */
async function getFeaturedFallback(supabase: any, limit: number) {
  console.log('[FEATURED API] Using fallback query (RPC not available)');

  // Query businesses with stats - try with status filter first, fallback without
  let businesses: any[] = [];
  let queryError: any = null;

  // Try with status filter
  const { data: statusData, error: statusError } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      image_url,
      category,
      sub_interest_id,
      description,
      location,
      verified,
      slug,
      business_stats (
        average_rating,
        total_reviews
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (statusError) {
    // Try without status filter (column might not exist)
    console.warn('[FEATURED API] Status filter failed, trying without:', statusError.message);
    const { data: noStatusData, error: noStatusError } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        image_url,
        category,
        sub_interest_id,
        description,
        location,
        verified,
        slug,
        business_stats (
          average_rating,
          total_reviews
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit * 3);

    if (noStatusError) {
      console.error('[FEATURED API] Fallback query error:', noStatusError);
      return [];
    }
    businesses = noStatusData || [];
  } else {
    businesses = statusData || [];
  }

  if (!businesses || businesses.length === 0) {
    return [];
  }

  // Sort by rating (but don't filter out - include all)
  const sorted = [...businesses].sort((a: any, b: any) => {
    const aStats = a.business_stats?.[0] || a.business_stats || {};
    const bStats = b.business_stats?.[0] || b.business_stats || {};
    const aRating = aStats.average_rating || 0;
    const bRating = bStats.average_rating || 0;
    // Sort by rating descending, then by reviews
    if (bRating !== aRating) return bRating - aRating;
    const aReviews = aStats.total_reviews || 0;
    const bReviews = bStats.total_reviews || 0;
    return bReviews - aReviews;
  }).slice(0, limit);

  // Transform to match expected format
  return sorted.map((b: any) => {
    const stats = b.business_stats?.[0] || b.business_stats || {};
    return {
      id: b.id,
      name: b.name,
      image_url: b.image_url || '',
      category: b.category,
      sub_interest_id: b.sub_interest_id,
      description: b.description,
      location: b.location,
      average_rating: stats.average_rating || 0,
      total_reviews: stats.total_reviews || 0,
      verified: b.verified,
      slug: b.slug,
      bucket: b.sub_interest_id || b.category,
    };
  });
}

/**
 * GET /api/featured
 * Returns featured businesses with geographic filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50); // Cap at 50
    const region = searchParams.get('region')?.trim() || null;

    let featuredData: any[] = [];
    let useRpc = true;

    // Try RPC first, fall back to direct query if it fails
    try {
      const { data, error } = await supabase
        .rpc('get_featured_businesses', {
          p_region: region,
          p_limit: limit
        });

      if (error) {
        console.warn('[FEATURED API] RPC error, using fallback:', error.message);
        useRpc = false;
      } else {
        featuredData = data || [];
      }
    } catch (rpcError: any) {
      console.warn('[FEATURED API] RPC call failed, using fallback:', rpcError?.message);
      useRpc = false;
    }

    // Use fallback if RPC failed or returned no data
    if (!useRpc || featuredData.length === 0) {
      featuredData = await getFeaturedFallback(supabase, limit);
    }

    if (!featuredData || featuredData.length === 0) {
      return NextResponse.json([]);
    }

    // Get business images for the featured businesses
    const businessIds = featuredData.map((b: any) => b.id);
    const { data: imagesData } = await supabase
      .from('business_images')
      .select('business_id, url, alt_text, is_primary')
      .in('business_id', businessIds)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    // Normalize images
    const normalizedImages = normalizeBusinessImages(imagesData || []);

    // Transform the data to match the UI expectations
    const featuredBusinesses = featuredData.map((business: any, index: number) => {
      const businessImages = normalizedImages[business.id] || [];
      const primaryImage = businessImages.find((img: any) => img.is_primary) || businessImages[0];

      // Use the bucket for category display (sub_interest_id or category)
      const displayCategory = business.bucket || business.category || 'Miscellaneous';

      return {
        id: business.id,
        name: business.name,
        image: primaryImage?.url || business.image_url || '',
        alt: primaryImage?.alt_text || business.name,
        category: displayCategory,
        description: business.description || `Featured in ${displayCategory}`,
        location: business.location || 'Cape Town',
        rating: business.average_rating > 0 ? 5 : 0, // UI expects 0 or 5 for display
        reviewCount: business.total_reviews,
        totalRating: business.average_rating,
        reviews: business.total_reviews,
        badge: "featured" as const,
        rank: index + 1,
        href: `/business/${business.slug || business.id}`,
        monthAchievement: `Featured ${displayCategory}`,
        verified: Boolean(business.verified),
      };
    });

    return NextResponse.json(featuredBusinesses);

  } catch (error) {
    console.error('Unexpected error in featured API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}