import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { getSubcategoryLabel } from "@/app/utils/subcategoryPlaceholders";
import { getInterestIdForSubcategory } from "@/app/lib/onboarding/subcategoryMapping";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FEATURED_PERIOD = 'month';

const pad2 = (value: number) => value.toString().padStart(2, '0');

function getFeaturedPeriod(date: Date) {
  if (FEATURED_PERIOD === 'month') {
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
  }
  const tempDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (tempDate.getUTCDay() + 6) % 7;
  tempDate.setUTCDate(tempDate.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 4));
  const weekNumber = 1 + Math.round((tempDate.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${tempDate.getUTCFullYear()}-W${pad2(weekNumber)}`;
}

function buildFeaturedSeed(period: string, region: string | null) {
  const normalizedRegion = (region || 'global').toLowerCase().trim() || 'global';
  return `${period}:${normalizedRegion}`;
}

function stableHash(seed: string, value: string) {
  return createHash('md5').update(`${seed}:${value}`).digest('hex');
}

function buildFeaturedEtag(seed: string, data: any[]) {
  const payload = `${seed}|${data
    .map((business) => [
      business.id,
      business.featured_score ?? '',
      business.total_reviews ?? '',
      business.last_activity_at ?? '',
    ].join(':'))
    .join('|')}`;
  return `"${createHash('sha1').update(payload).digest('hex')}"`;
}

function buildFeaturedReason(business: any) {
  const recent30 = Number(business.recent_reviews_30d ?? 0);
  const totalReviews = Number(business.total_reviews ?? 0);
  const averageRating = Number(business.average_rating ?? 0);

  if (recent30 >= 5) {
    return { label: "Rising this month", metric: "recent_reviews_30d", value: recent30 };
  }
  if (totalReviews >= 50) {
    return { label: "Community favorite", metric: "total_reviews", value: totalReviews };
  }
  if (averageRating >= 4.7) {
    return { label: "Top rated", metric: "average_rating", value: averageRating };
  }
  return { label: "Featured pick", metric: "featured_score", value: Number(business.featured_score ?? 0) };
}

/**
 * Fallback: fetch top-rated businesses directly when RPC does not exist
 */
async function getFeaturedFallback(
  supabase: any,
  options: { limit: number; region: string | null; seed: string }
) {
  console.log('[FEATURED API] Using fallback query (RPC not available)');
  const { limit, region, seed } = options;

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
      last_activity_at,
      updated_at,
      created_at,
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
        last_activity_at,
        updated_at,
        created_at,
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

  const poolIds = businesses.map((business) => business.id);
  const recentCounts30 = new Map<string, number>();
  const recentCounts7 = new Map<string, number>();

  if (poolIds.length > 0) {
    const now = Date.now();
    const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentReviews } = await supabase
      .from('reviews')
      .select('business_id, created_at')
      .in('business_id', poolIds)
      .gte('created_at', since30);

    for (const review of recentReviews || []) {
      const businessId = review.business_id;
      const createdAt = new Date(review.created_at).getTime();
      recentCounts30.set(businessId, (recentCounts30.get(businessId) || 0) + 1);
      if (createdAt >= now - 7 * 24 * 60 * 60 * 1000) {
        recentCounts7.set(businessId, (recentCounts7.get(businessId) || 0) + 1);
      }
    }
  }

  const priorRating = 4.0;
  const priorReviews = 5;
  const minRating = 4.0;
  const minReviews = 5;
  const freshnessCutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;

  const scored = businesses
    .map((business) => {
      const stats = business.business_stats?.[0] || business.business_stats || {};
      const averageRating = Number(stats.average_rating || 0);
      const totalReviews = Number(stats.total_reviews || 0);
      const lastActivity = business.last_activity_at || business.updated_at || business.created_at;
      const lastActivityTime = lastActivity ? new Date(lastActivity).getTime() : 0;

      if (averageRating < minRating || totalReviews < minReviews || lastActivityTime < freshnessCutoff) {
        return null;
      }

      const recent30 = recentCounts30.get(business.id) || 0;
      const recent7 = recentCounts7.get(business.id) || 0;
      const bayesianRating = (averageRating * totalReviews + priorRating * priorReviews) / (totalReviews + priorReviews);
      const score =
        bayesianRating * 0.6 +
        Math.log(1 + totalReviews) * 0.2 +
        Math.log(1 + recent30) * 0.2;

      const bucket = business.sub_interest_id || business.category;
      const isLocal = !!region && typeof business.location === 'string'
        ? business.location.toLowerCase().includes(region.toLowerCase())
        : false;

      return {
        id: business.id,
        name: business.name,
        image_url: business.image_url || '',
        category: business.category,
        interest_id: business.interest_id || null,
        sub_interest_id: business.sub_interest_id,
        description: business.description,
        location: business.location,
        average_rating: averageRating,
        total_reviews: totalReviews,
        verified: business.verified,
        slug: business.slug,
        last_activity_at: lastActivity,
        recent_reviews_30d: recent30,
        recent_reviews_7d: recent7,
        bayesian_rating: bayesianRating,
        featured_score: score,
        bucket,
        is_local: isLocal,
        seed_hash: stableHash(seed, business.id),
      };
    })
    .filter(Boolean) as Array<any>;

  const sorted = [...scored].sort((a, b) => {
    if (a.is_local !== b.is_local) return a.is_local ? -1 : 1;
    if (b.featured_score !== a.featured_score) return b.featured_score - a.featured_score;
    if (b.total_reviews !== a.total_reviews) return b.total_reviews - a.total_reviews;
    const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
    const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.seed_hash.localeCompare(b.seed_hash);
  });

  const winners: any[] = [];
  const usedBuckets = new Set<string>();
  const usedIds = new Set<string>();
  for (const business of sorted) {
    const key = (business.bucket || 'miscellaneous').toString().trim().toLowerCase();
    if (!usedBuckets.has(key)) {
      winners.push(business);
      usedBuckets.add(key);
      usedIds.add(business.id);
    }
  }

  const combined = [
    ...winners,
    ...sorted.filter((business) => !usedIds.has(business.id)),
  ].slice(0, limit);

  // Transform to match expected format
  return combined.map((b: any) => ({
    id: b.id,
    name: b.name,
    image_url: b.image_url || '',
    category: b.category,
    interest_id: b.interest_id || null,
    sub_interest_id: b.sub_interest_id,
    description: b.description,
    location: b.location,
    average_rating: b.average_rating || 0,
    total_reviews: b.total_reviews || 0,
    verified: b.verified,
    slug: b.slug,
    last_activity_at: b.last_activity_at,
    recent_reviews_30d: b.recent_reviews_30d || 0,
    recent_reviews_7d: b.recent_reviews_7d || 0,
    bayesian_rating: b.bayesian_rating || 0,
    featured_score: b.featured_score || 0,
    bucket: b.bucket,
  }));
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
    const generatedAt = new Date();
    const period = getFeaturedPeriod(generatedAt);
    const seed = buildFeaturedSeed(period, region);

    let featuredData: any[] = [];
    let useRpc = true;

    // Try RPC first, fall back to direct query if it fails
    try {
      let dataResult: any[] | null = null;
      let rpcError: any = null;

      const attempt = await supabase.rpc('get_featured_businesses', {
        p_region: region,
        p_limit: limit,
        p_seed: seed,
      });
      dataResult = attempt.data;
      rpcError = attempt.error;

      if (rpcError && rpcError.message?.includes('p_seed')) {
        const retry = await supabase.rpc('get_featured_businesses', {
          p_region: region,
          p_limit: limit,
        });
        dataResult = retry.data;
        rpcError = retry.error;
      }

      if (rpcError) {
        console.warn('[FEATURED API] RPC error, using fallback:', rpcError.message);
        useRpc = false;
      } else {
        featuredData = dataResult || [];
      }
    } catch (rpcError: any) {
      console.warn('[FEATURED API] RPC call failed, using fallback:', rpcError?.message);
      useRpc = false;
    }

    // Use fallback if RPC failed or returned no data
    if (!useRpc || featuredData.length === 0) {
      featuredData = await getFeaturedFallback(supabase, { limit, region, seed });
    }

    if (!featuredData || featuredData.length === 0) {
      return NextResponse.json({
        data: [],
        meta: {
          period,
          generated_at: generatedAt.toISOString(),
          seed,
          source: useRpc ? 'rpc' : 'fallback',
          count: 0,
        }
      });
    }

    const featuredEtag = buildFeaturedEtag(seed, featuredData);
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === featuredEtag) {
      const response = new NextResponse(null, { status: 304 });
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      response.headers.set('ETag', featuredEtag);
      response.headers.set('X-Featured-Period', period);
      response.headers.set('X-Featured-Generated-At', generatedAt.toISOString());
      return response;
    }

    // Get business images for the featured businesses
    const businessIds = featuredData.map((b: any) => b.id);
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
    const featuredBusinesses = featuredData.map((business: any, index: number) => {
      const businessImages = imagesByBusinessId[business.id] || [];
      const primaryImage = businessImages.find((img) => img.is_primary) || businessImages[0];
      const uploadedImageUrls = businessImages.map((img) => img.url).filter(Boolean);

      const subInterestSlug = (business.sub_interest_id || business.bucket || business.category || '').toString().trim().toLowerCase();
      const displayCategory = getSubcategoryLabel(subInterestSlug);
      // Derive parent interest ID from subcategory slug, fall back to DB value
      const interestId = business.interest_id || getInterestIdForSubcategory(subInterestSlug) || 'miscellaneous';
      const reason = buildFeaturedReason(business);

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
        ui_hints: {
          badge: "featured",
          rank: index + 1,
          reason,
          period,
        },
        featured_score: business.featured_score,
        recent_reviews_30d: business.recent_reviews_30d ?? 0,
        recent_reviews_7d: business.recent_reviews_7d ?? 0,
        bayesian_rating: business.bayesian_rating ?? null,
        verified: Boolean(business.verified),
      };
    });

    const payload = {
      data: featuredBusinesses,
      meta: {
        period,
        generated_at: generatedAt.toISOString(),
        seed,
        source: useRpc ? 'rpc' : 'fallback',
        count: featuredBusinesses.length,
      },
    };

    const response = NextResponse.json(payload);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    response.headers.set('ETag', featuredEtag);
    response.headers.set('X-Featured-Period', period);
    response.headers.set('X-Featured-Generated-At', generatedAt.toISOString());
    return response;

  } catch (error) {
    console.error('Unexpected error in featured API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
