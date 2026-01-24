import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

// In-memory cache with TTL (30 seconds)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000;

function getCacheKey(searchParams: URLSearchParams): string {
  return 'specials:' + Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 50) {
    const oldestKey = Array.from(cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
    cache.delete(oldestKey);
  }
}

/**
 * GET /api/specials
 * Fetch active specials from the events_and_specials table
 *
 * Query parameters:
 * - limit: Number of specials to return (default: 20, max: 100)
 * - offset: Offset for pagination (default: 0)
 * - search: Search term for title/description
 * - businessId: Filter by business ID
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Check cache first
    const cacheKey = getCacheKey(searchParams);
    const cached = getCachedData(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    const supabase = await getServerSupabase(req);

    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search')?.trim();
    const businessId = searchParams.get('businessId');

    // Query events_and_specials table for type='special'
    let query = supabase
      .from('events_and_specials')
      .select(`
        id,
        title,
        type,
        description,
        start_date,
        end_date,
        location,
        icon,
        image,
        price,
        rating,
        booking_url,
        booking_contact,
        business_id,
        created_by,
        created_at,
        businesses:business_id (
          id,
          name,
          slug,
          logo_url
        )
      `, { count: 'exact' })
      .eq('type', 'special')
      .order('start_date', { ascending: true });

    // Filter out expired specials (end_date < now or start_date < now if no end_date)
    const now = new Date().toISOString();
    query = query.or(`end_date.gte.${now},and(end_date.is.null,start_date.gte.${now})`);

    // Filter by business ID if provided
    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    // Search across title and description
    if (search && search.length > 0) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: specials, error, count } = await query;

    if (error) {
      console.error('[Specials API] Error fetching specials:', error);
      return NextResponse.json(
        { error: 'Failed to fetch specials', details: error.message },
        { status: 500 }
      );
    }

    // Transform to frontend format
    const transformedSpecials = (specials || []).map((special: any) => ({
      id: special.id,
      title: special.title,
      type: 'special' as const,
      image: special.image || null,
      alt: `${special.title} special`,
      icon: special.icon,
      location: special.location || 'Location TBA',
      rating: special.rating || 0,
      startDate: special.start_date ? new Date(special.start_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) : 'TBA',
      endDate: special.end_date ? new Date(special.end_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) : undefined,
      startDateISO: special.start_date,
      endDateISO: special.end_date,
      price: special.price ? `R${special.price}` : null,
      description: special.description || null,
      bookingUrl: special.booking_url,
      bookingContact: special.booking_contact,
      businessId: special.business_id,
      businessName: special.businesses?.name || 'Unknown Business',
      businessSlug: special.businesses?.slug,
      businessLogo: special.businesses?.logo_url,
      createdBy: special.created_by,
      createdAt: special.created_at,
      isBusinessOwned: true,
      source: 'business',
      href: `/special/${special.id}`,
    }));

    const response = {
      specials: transformedSpecials,
      count: count || 0,
      limit,
      offset,
    };

    // Cache the response
    setCachedData(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[Specials API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}
