import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { getCategoryLabelFromBusiness } from '@/app/utils/subcategoryPlaceholders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/trending
 *
 * 1. Try get_trending_businesses (real trending).
 * 2. If result < limit, fill remainder with get_quality_fallback_businesses (excluding IDs already used).
 * 3. If still short, fill from get_new_businesses.
 * Outcome: home page never empty; "real trending" stays first and honest.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  console.log('[TRENDING API] GET start at', new Date().toISOString());
  try {
    let supabase;
    try {
      supabase = getServiceSupabase();
    } catch {
      supabase = await getServerSupabase();
      console.warn('[TRENDING API] Service role not configured, using anon (guests may get empty if RLS restricts)');
    }
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const category = searchParams.get('category')?.trim() || null;

    let businesses: any[] = [];
    const usedIds = new Set<string>();

    // 1. Try get_trending_businesses
    const { data: trendingData, error: trendingError } = await supabase.rpc('get_trending_businesses', {
      p_limit: limit,
      p_category: category,
    });
    if (!trendingError && Array.isArray(trendingData) && trendingData.length > 0) {
      businesses = trendingData;
      businesses.forEach((b: any) => usedIds.add(b.id));
    }
    if (trendingError) {
      console.warn('[TRENDING API] get_trending_businesses error (will fill with fallbacks):', trendingError.message);
    }

    // 2. If short, fill with get_quality_fallback_businesses (excluding already used)
    if (businesses.length < limit) {
      const need = limit - businesses.length;
      const { data: qualityData } = await supabase.rpc('get_quality_fallback_businesses', {
        p_limit: limit + need,
      });
      const qualityList = Array.isArray(qualityData) ? qualityData : [];
      for (const b of qualityList) {
        if (businesses.length >= limit) break;
        if (b?.id && !usedIds.has(b.id)) {
          usedIds.add(b.id);
          businesses.push(b);
        }
      }
    }

    // 3. If still short, fill from get_new_businesses (excluding already used)
    if (businesses.length < limit) {
      const need = limit - businesses.length;
      const { data: newData } = await supabase.rpc('get_new_businesses', {
        p_limit: limit + need,
        p_category: category,
      });
      const newList = Array.isArray(newData) ? newData : [];
      for (const b of newList) {
        if (businesses.length >= limit) break;
        if (b?.id && !usedIds.has(b.id)) {
          usedIds.add(b.id);
          businesses.push(b);
        }
      }
    }

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
    // Display category from sub_interest_id first (canonical slug), else category
    const transformed = businesses.map((business: any) => {
      const images = imagesByBusinessId[business.id] || [];
      const primaryImage = images.find((img) => img.is_primary) || images[0];
      const uploadedImageUrls = images.map((img) => img.url).filter(Boolean);
      const displayCategory = getCategoryLabelFromBusiness(business) || 'Miscellaneous';
      const lat = business.lat ?? business.latitude ?? null;
      const lng = business.lng ?? business.longitude ?? null;

      return {
        id: business.id,
        name: business.name,
        image: primaryImage?.url || business.image_url || business.uploaded_image || null,
        image_url: primaryImage?.url || business.image_url || business.uploaded_image || null,
        uploaded_images: uploadedImageUrls,
        alt: primaryImage?.alt_text || business.name,
        category: displayCategory,
        sub_interest_id: business.sub_interest_id ?? undefined,
        location: business.location,
        lat,
        lng,
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

    console.log('[TRENDING API] GET end total ms:', Date.now() - start);
    const response = NextResponse.json(payload);

    // Cache for 15 minutes (matches MV refresh interval), serve stale for 30 min
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=900, stale-while-revalidate=1800',
    );

    return response;
  } catch (error: unknown) {
    const totalMs = Date.now() - start;
    const msg = error instanceof Error ? error.message : String(error);
    if (/timeout|timed out|abort/i.test(msg)) {
      console.warn('[TRENDING API] GET timed out / aborted:', msg, 'total ms:', totalMs);
    }
    console.error('[TRENDING API] GET end (error) total ms:', totalMs);
    console.error('[TRENDING API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
