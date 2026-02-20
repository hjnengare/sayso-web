import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { getCategoryLabelFromBusiness } from '@/app/utils/subcategoryPlaceholders';
import { getInterestIdForSubcategory } from '@/app/lib/onboarding/subcategoryMapping';
import {
  selectColdStartTrending,
  getTrendingSeed,
  type ColdStartCandidate,
} from '@/app/utils/trendingColdStart';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
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

/**
 * GET /api/trending
 *
 * Cold-start trending (Phase 0): metadata-only score, diversity-first selection.
 * 1. get_trending_cold_start_candidates (pool from businesses, no stats).
 * 2. Round-based selection: best per subcategory, category cap, deterministic rotation.
 * 3. Enrich selected ids from businesses + business_stats + images.
 */
const TRENDING_POOL_SIZE = 1500;
const TRENDING_TIME_BUCKET_MINUTES = 15;

function logSampleRows(label: string, rows: unknown[], debug: boolean) {
  if (!debug) return;
  const sample = rows?.[0] ?? null;
  const s = sample as Record<string, unknown> | null;
  console.log(`[TRENDING API][debug] ${label} count:`, Array.isArray(rows) ? rows.length : 0);
  console.log(`[TRENDING API][debug] ${label} sample keys:`, s ? Object.keys(s).sort() : []);
  console.log(`[TRENDING API][debug] ${label} sample values:`, {
    id: s?.id ?? null,
    primary_subcategory_slug: s?.primary_subcategory_slug ?? null,
    primary_category_slug: s?.primary_category_slug ?? null,
    cold_start_score: s?.cold_start_score ?? null,
  });
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  console.log('[TRENDING API] GET start at', new Date().toISOString());
  try {
    let supabase;
    try {
      supabase = getServiceSupabase();
    } catch {
      supabase = await getServerSupabase();
      console.warn(
        '[TRENDING API] Service role not configured, using anon (guests may get empty if RLS restricts)',
      );
    }
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const category = searchParams.get('category')?.trim() || null;
    const city = searchParams.get('city')?.trim() || null;
    const debug = searchParams.get('debug') === '1';

    // 1. Cold-start candidate pool (metadata-only score, no stats)
    const { data: candidateRows, error: candidatesError } = await withTimeout(
      supabase.rpc('get_trending_cold_start_candidates', {
        p_pool_size: TRENDING_POOL_SIZE,
        p_city: city || null,
      }),
      FETCH_TIMEOUT_MS,
      'trending:candidates'
    );

    if (candidatesError) {
      console.warn('[TRENDING API] get_trending_cold_start_candidates error:', candidatesError.message);
    }
    const rawCandidates = (Array.isArray(candidateRows) ? candidateRows : []) as Array<{
      id: string;
      cold_start_score: number;
      primary_category_slug: string | null;
      primary_subcategory_slug: string;
      primary_subcategory_label?: string | null;
    }>;
    console.log('[TRENDING API] cold_start_candidates rows:', rawCandidates.length);
    logSampleRows('cold_start_candidates', rawCandidates, debug);

    let candidates: ColdStartCandidate[] = rawCandidates.map((r) => ({
      id: r.id,
      cold_start_score: r.cold_start_score,
      primary_category_slug: r.primary_category_slug,
      primary_subcategory_slug: r.primary_subcategory_slug,
      primary_subcategory_label: r.primary_subcategory_label ?? null,
    }));

    if (category) {
      const cat = category.trim().toLowerCase();
      candidates = candidates.filter(
        (c) => (c.primary_subcategory_slug ?? '').trim().toLowerCase() === cat,
      );
      console.log('[TRENDING API] after category filter:', candidates.length);
    }

    // 2. Diversity-first selection (round-based, deterministic seed)
    const seed = getTrendingSeed(TRENDING_TIME_BUCKET_MINUTES, city);
    const selected = selectColdStartTrending(candidates, {
      limit,
      seed,
    });

    if (selected.length === 0) {
      const payload = {
        businesses: [],
        meta: { count: 0, refreshedAt: new Date().toISOString(), category },
      };
      const response = NextResponse.json(payload);
      response.headers.set('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
      return response;
    }

    const selectedIds = selected.map((c) => c.id);
    if (debug) {
      const byKey = new Map<string, number>();
      for (const c of selected) {
        const key = (c.primary_subcategory_slug ?? 'miscellaneous').trim().toLowerCase();
        byKey.set(key, (byKey.get(key) ?? 0) + 1);
      }
      console.log(
        '[TRENDING API][debug] selected key counts:',
        Object.fromEntries([...byKey.entries()].sort((a, b) => b[1] - a[1])),
      );
    }

    // 3. Enrich: businesses (primary_* columns) + business_stats (rating/reviews)
    const { data: businessRows, error: businessError } = await withTimeout(
      supabase
        .from('businesses')
        .select(
          'id, name, description, primary_subcategory_slug, primary_subcategory_label, primary_category_slug, location, address, image_url, verified, price_range, badge, slug, lat, lng, status, is_system',
        )
        .in('id', selectedIds),
      FETCH_TIMEOUT_MS,
      'trending:businesses'
    );

    if (businessError) {
      console.warn('[TRENDING API] businesses enrich error:', businessError.message);
    }
    const businessList = Array.isArray(businessRows) ? businessRows : [];
    const businessById = new Map(businessList.map((b: Record<string, unknown>) => [b.id as string, b]));

    const { data: statsRows } = await withTimeout(
      supabase
        .from('business_stats')
        .select('business_id, total_reviews, average_rating, percentiles')
        .in('business_id', selectedIds),
      FETCH_TIMEOUT_MS,
      'trending:business_stats'
    );
    const statsById = new Map(
      (Array.isArray(statsRows) ? statsRows : []).map((s: { business_id: string }) => [s.business_id, s]),
    );

    // Preserve selection order; guardrail: only return active businesses
    const businesses: Record<string, unknown>[] = [];
    for (const id of selectedIds) {
      const b = businessById.get(id) as Record<string, unknown> | undefined;
      if (!b || (b.status as string) !== 'active' || b.is_system === true) continue;
      const stats = statsById.get(id) as
        | { total_reviews?: number; average_rating?: number; percentiles?: unknown }
        | undefined;
      businesses.push({
        ...b,
        sub_interest_id: b.primary_subcategory_slug,
        category: b.primary_subcategory_slug,
        interest_id: b.primary_category_slug,
        category_label: b.primary_subcategory_label,
        total_reviews: stats?.total_reviews ?? 0,
        average_rating: stats?.average_rating ?? 0,
        percentiles: stats?.percentiles ?? null,
        last_refreshed: new Date().toISOString(),
      });
    }

    // 4. Fetch images
    let imagesByBusinessId: Record<
      string,
      Array<{ url: string; alt_text: string | null; is_primary: boolean | null }>
    > = {};
    if (selectedIds.length > 0) {
      const { data: imagesData } = await withTimeout(
        supabase
          .from('business_images')
          .select('business_id, url, alt_text, is_primary')
          .in('business_id', selectedIds)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: false }),
        FETCH_TIMEOUT_MS,
        'trending:images'
      );

      for (const img of imagesData || []) {
        const bid = (img as { business_id: string }).business_id;
        if (!imagesByBusinessId[bid]) imagesByBusinessId[bid] = [];
        imagesByBusinessId[bid].push(img as { url: string; alt_text: string | null; is_primary: boolean | null });
      }
    }

    // 5. Transform to card shape (same as before for hooks/UI)
    const transformed = businesses.map((business: Record<string, unknown>) => {
      const images = imagesByBusinessId[(business.id as string) || ''] || [];
      const primaryImage = images.find((img) => img.is_primary) || images[0];
      const uploadedImageUrls = images.map((img) => img.url).filter(Boolean);
      const slug = (business.primary_subcategory_slug ?? business.category ?? '')
        .toString()
        .trim()
        .toLowerCase();
      const dbLabel =
        business.primary_subcategory_label && typeof business.primary_subcategory_label === 'string'
          ? business.primary_subcategory_label.trim()
          : '';
      const categoryLabel =
        dbLabel || getCategoryLabelFromBusiness(business) || 'Miscellaneous';
      const lat = business.lat ?? business.latitude ?? null;
      const lng = business.lng ?? business.longitude ?? null;
      const avgRating = Number(business.average_rating ?? 0);
      const totalReviews = Number(business.total_reviews ?? 0);

      return {
        id: business.id,
        name: business.name,
        image: primaryImage?.url || business.image_url || null,
        image_url: primaryImage?.url || business.image_url || null,
        uploaded_images: uploadedImageUrls,
        alt: primaryImage?.alt_text || business.name,
        category: slug || undefined,
        category_label: categoryLabel,
        sub_interest_id: business.primary_subcategory_slug ?? (slug || undefined),
        subInterestId: slug || undefined,
        subInterestLabel: categoryLabel,
        interestId:
          business.primary_category_slug ||
          (slug ? getInterestIdForSubcategory(slug) : undefined) ||
          undefined,
        location: business.location,
        address: business.address ?? undefined,
        phone: business.phone ?? undefined,
        website: business.website ?? undefined,
        email: business.email ?? undefined,
        description: business.description ?? undefined,
        lat,
        lng,
        rating: avgRating > 0 ? Math.round(avgRating * 2) / 2 : undefined,
        totalRating: avgRating > 0 ? avgRating : undefined,
        reviews: totalReviews,
        badge: business.verified && business.badge ? business.badge : undefined,
        slug: (business.slug as string) ?? (business.id as string),
        href: `/business/${business.slug || business.id}`,
        verified: Boolean(business.verified),
        priceRange: business.price_range || '$$',
        hasRating: avgRating > 0,
        percentiles: business.percentiles ?? undefined,
        trendingScore: null,
      };
    });

    const refreshedAt = new Date().toISOString();
    const payload = {
      businesses: transformed,
      meta: { count: transformed.length, refreshedAt, category },
    };

    const totalMs = Date.now() - start;
    console.log('[TRENDING API] GET end total ms:', totalMs);
    const response = NextResponse.json(payload);
    response.headers.set('Cache-Control', CACHE_CONTROL);
    response.headers.set('X-Query-Duration-MS', String(totalMs));
    return response;
  } catch (error: unknown) {
    const totalMs = Date.now() - start;
    const msg = error instanceof Error ? error.message : String(error);
    if (/timeout|timed out|abort/i.test(msg)) {
      console.warn('[TRENDING API] GET timed out / aborted:', msg, 'total ms:', totalMs);
    }
    console.error('[TRENDING API] GET end (error) total ms:', totalMs);
    console.error('[TRENDING API] Unexpected error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
    response.headers.set('Cache-Control', CACHE_CONTROL);
    response.headers.set('X-Query-Duration-MS', String(totalMs));
    return response;
  }
}
