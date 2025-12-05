import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

// Cache configuration - 30 seconds for events data
export const revalidate = 30;
export const dynamic = 'force-dynamic';

// In-memory cache with TTL (30 seconds)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(searchParams: URLSearchParams): string {
  return Array.from(searchParams.entries())
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
  // Clean up old cache entries (keep last 50)
  if (cache.size > 50) {
    const oldestKey = Array.from(cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
    cache.delete(oldestKey);
  }
}

/**
 * GET /api/events
 * Fetch events from the ticketmaster_events table
 * 
 * Query parameters:
 * - limit: Number of events to return (default: 20, max: 100)
 * - offset: Offset for pagination (default: 0)
 * - city: Filter by city
 * - segment: Filter by segment (e.g., 'Music', 'Sports')
 * - upcoming: Only return upcoming events (default: true)
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
    
    // Limit max results to prevent performance issues
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const city = searchParams.get('city');
    const segment = searchParams.get('segment');
    const search = searchParams.get('search')?.trim();
    const upcoming = searchParams.get('upcoming') !== 'false'; // Default to true

    // Optimize query - only select needed fields
    let query = supabase
      .from('ticketmaster_events')
      .select('id, ticketmaster_id, title, description, image_url, start_date, end_date, city, venue_name, segment, genre, price_range', { count: 'exact' })
      .order('start_date', { ascending: true });

    // Filter by city if provided
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    // Filter by segment if provided
    if (segment) {
      query = query.eq('segment', segment);
    }

    // Filter for upcoming events only
    if (upcoming) {
      const now = new Date().toISOString();
      query = query.gte('start_date', now);
    }

    // Search across multiple fields (title, description, venue, city)
    if (search && search.length > 0) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,venue_name.ilike.%${search}%,city.ilike.%${search}%`);
    }

    // Add timeout promise to ensure response within 2 seconds
    const queryPromise = query.range(offset, offset + limit - 1);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 1800)
    );

    const { data: events, error, count } = await Promise.race([
      queryPromise,
      timeoutPromise,
    ]) as any;

    if (error) {
      console.error('[Events API] Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events', details: error.message },
        { status: 500 }
      );
    }

    const response = {
      events: events || [],
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
    console.error('[Events API] Unexpected error:', error);
    
    // If timeout, return cached data if available
    if (error.message === 'Query timeout') {
      const cacheKey = getCacheKey(new URL(req.url).searchParams);
      const cached = getCachedData(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'X-Cache': 'stale',
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        });
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}

