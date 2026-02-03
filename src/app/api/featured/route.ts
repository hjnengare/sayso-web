import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { getSubcategoryLabel } from "@/app/utils/subcategoryPlaceholders";
import { getInterestIdForSubcategory } from "@/app/lib/onboarding/subcategoryMapping";

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

  // Fetch a large pool so we can pick one per subcategory (diversity)
  const poolSize = Math.min(limit * 10, 100);
  const { data: statusData, error: statusError } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      image_url,
      category,
      interest_id,
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
    .limit(poolSize);

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
      .limit(poolSize);

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

  // Sort by rating; return full pool so caller can pick one per subcategory (diversity)
  const sorted = [...businesses].sort((a: any, b: any) => {
    const aStats = a.business_stats?.[0] || a.business_stats || {};
    const bStats = b.business_stats?.[0] || b.business_stats || {};
    const aRating = aStats.average_rating || 0;
    const bRating = bStats.average_rating || 0;
    if (bRating !== aRating) return bRating - aRating;
    const aReviews = aStats.total_reviews || 0;
    const bReviews = bStats.total_reviews || 0;
    return bReviews - aReviews;
  });

  // Transform to match expected format
  return sorted.map((b: any) => {
    const stats = b.business_stats?.[0] || b.business_stats || {};
    return {
      id: b.id,
      name: b.name,
      image_url: b.image_url || '',
      category: b.category,
      interest_id: b.interest_id || null,
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

    // Diversify: one business per category/subcategory so featured list is mixed
    const businessesByCategory = new Map<string, any>();
    const categoryKey = (b: any) =>
      (b.sub_interest_id || b.bucket || b.category || "miscellaneous").toString().trim().toLowerCase();

    for (const business of featuredData) {
      const key = categoryKey(business);
      if (!businessesByCategory.has(key)) {
        businessesByCategory.set(key, business);
      }
    }

    let diverseFeaturedData = Array.from(businessesByCategory.values()).slice(0, limit);

    // If we have fewer than 4, fill from the rest of the pool (any category) so we show at least 4
    const minFeatured = 4;
    if (diverseFeaturedData.length < minFeatured && featuredData.length > diverseFeaturedData.length) {
      const usedIds = new Set(diverseFeaturedData.map((b: any) => b.id));
      const remaining = featuredData.filter((b: any) => !usedIds.has(b.id));
      const needed = Math.min(minFeatured - diverseFeaturedData.length, remaining.length);
      for (let i = 0; i < needed; i++) {
        diverseFeaturedData.push(remaining[i]);
      }
    }

    // Randomize display order so the section doesn’t always look the same
    diverseFeaturedData = [...diverseFeaturedData].sort(() => Math.random() - 0.5);

    console.log('[FEATURED API] Diversity check:', {
      original_count: featuredData.length,
      unique_categories: businessesByCategory.size,
      final_count: diverseFeaturedData.length,
      categories: Array.from(businessesByCategory.keys()),
    });

    // Get business images for the featured businesses
    const businessIds = diverseFeaturedData.map((b: any) => b.id);
    const { data: imagesData } = await supabase
      .from('business_images')
      .select('business_id, url, alt_text, is_primary')
      .in('business_id', businessIds)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    // Group images by business_id
    const imagesByBusinessId: Record<string, Array<{ business_id: string; url: string; alt_text: string | null; is_primary: boolean | null }>> = {};
    for (const img of imagesData || []) {
      if (!imagesByBusinessId[img.business_id]) {
        imagesByBusinessId[img.business_id] = [];
      }
      imagesByBusinessId[img.business_id].push(img);
    }

    // Transform the data to match the UI expectations
    const featuredBusinesses = diverseFeaturedData.map((business: any, index: number) => {
      const businessImages = imagesByBusinessId[business.id] || [];
      const primaryImage = businessImages.find((img) => img.is_primary) || businessImages[0];
      const uploadedImageUrls = businessImages.map((img) => img.url).filter(Boolean);

      const subInterestSlug = (business.sub_interest_id || business.bucket || business.category || '').toString().trim().toLowerCase();
      const displayCategory = getSubcategoryLabel(subInterestSlug);
      // Derive parent interest ID from subcategory slug, fall back to DB value
      const interestId = business.interest_id || getInterestIdForSubcategory(subInterestSlug) || 'miscellaneous';

      return {
        id: business.id,
        name: business.name,
        image: primaryImage?.url || business.image_url || '',
        image_url: primaryImage?.url || business.image_url || '',
        uploaded_images: uploadedImageUrls,
        alt: primaryImage?.alt_text || business.name,
        category: displayCategory,
        // Snake_case for backward compatibility
        sub_interest_id: subInterestSlug,
        // CamelCase for leaderboard components
        interestId,
        subInterestId: subInterestSlug,
        subInterestLabel: displayCategory,
        description: business.description || `Featured in ${displayCategory}`,
        location: business.location || 'Cape Town',
        rating: business.average_rating > 0 ? 5 : 0,
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