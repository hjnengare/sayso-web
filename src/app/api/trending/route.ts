import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/trending
 *
 * Returns globally-trending businesses backed by the `mv_trending_businesses`
 * materialized view (refreshed every 15 min via pg_cron).
 *
 * This endpoint is intentionally user-agnostic — results are the same for
 * every visitor so CDN / edge caching works properly.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const category = searchParams.get('category')?.trim() || null;

    // Call the RPC backed by mv_trending_businesses
    const { data, error } = await supabase.rpc('get_trending_businesses', {
      p_limit: limit,
      p_category: category,
    });

    if (error) {
      console.error('[TRENDING API] RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trending businesses', details: error.message },
        { status: 500 },
      );
    }

    const businesses = data || [];

    // Fetch uploaded images for the trending businesses
    const businessIds = businesses.map((b: any) => b.id);
    let imagesByBusinessId: Record<string, Array<{ url: string; alt_text: string | null; is_primary: boolean | null }>> = {};

    if (businessIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('business_images')
        .select('business_id, url, alt_text, is_primary')
        .in('business_id', businessIds)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      for (const img of imagesData || []) {
        if (!imagesByBusinessId[img.business_id]) {
          imagesByBusinessId[img.business_id] = [];
        }
        imagesByBusinessId[img.business_id].push(img);
      }
    }

    // Transform to the card shape expected by BusinessRow / BusinessCard
    const transformed = businesses.map((business: any) => {
      const images = imagesByBusinessId[business.id] || [];
      const primaryImage = images.find((img) => img.is_primary) || images[0];
      const uploadedImageUrls = images.map((img) => img.url).filter(Boolean);

      return {
        id: business.id,
        name: business.name,
        image: primaryImage?.url || business.image_url || business.uploaded_image || null,
        image_url: primaryImage?.url || business.image_url || business.uploaded_image || null,
        uploaded_images: uploadedImageUrls,
        alt: primaryImage?.alt_text || business.name,
        category: business.category,
        location: business.location,
        rating: business.average_rating > 0 ? Math.round(business.average_rating * 2) / 2 : undefined,
        totalRating: business.average_rating > 0 ? business.average_rating : undefined,
        reviews: business.total_reviews || 0,
        badge: business.verified && business.badge ? business.badge : undefined,
        href: `/business/${business.slug || business.id}`,
        verified: business.verified || false,
        priceRange: business.price_range || '$$',
        hasRating: business.average_rating > 0,
        percentiles: business.percentiles,
        trendingScore: business.trending_score,
      };
    });

    // Extract refreshed_at from the first result (all rows share the same timestamp)
    const refreshedAt = businesses[0]?.last_refreshed || null;

    const payload = {
      businesses: transformed,
      meta: {
        count: transformed.length,
        refreshedAt,
        category,
      },
    };

    const response = NextResponse.json(payload);

    // Cache for 15 minutes (matches MV refresh interval), serve stale for 30 min
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=900, stale-while-revalidate=1800',
    );

    return response;
  } catch (error) {
    console.error('[TRENDING API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
