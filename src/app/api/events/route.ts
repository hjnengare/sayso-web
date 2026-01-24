import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getTodayUTC } from '@/app/lib/services/eventLifecycle';

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

    // Optimize query - select all fields from ticketmaster_events table
    // Include raw_data for attraction/venue ID extraction (needed for event consolidation)
    let query = supabase
      .from('ticketmaster_events')
      .select('id, ticketmaster_id, title, description, type, start_date, end_date, location, city, country, venue_name, venue_address, image_url, url, price_range, classification, segment, genre, sub_genre, raw_data', { count: 'exact' })
      .order('start_date', { ascending: true });

    // Filter by city if provided
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    // Filter by segment if provided
    if (segment) {
      query = query.eq('segment', segment);
    }

    // Filter for upcoming events only (events that haven't fully ended)
    // An event is considered upcoming if its end_date (or start_date if no end_date) is today or later
    if (upcoming) {
      const todayStart = getTodayUTC().toISOString();
      // Use OR filter: end_date >= today OR (end_date is null AND start_date >= today)
      // This ensures multi-day events still show until their end date passes
      query = query.or(`end_date.gte.${todayStart},and(end_date.is.null,start_date.gte.${todayStart})`);
    }

    // Search across multiple fields (title, description, venue, city)
    if (search && search.length > 0) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,venue_name.ilike.%${search}%,city.ilike.%${search}%`);
    }

    // Apply pagination directly in the query
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

/**
 * POST /api/events
 * Create a custom event (requires authentication)
 * Note: Custom events are stored in ticketmaster_events table with ticketmaster_id = null
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to create an event.' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      title,
      description,
      type, // 'event' or 'special'
      startDate,
      endDate,
      location,
      city,
      venueName,
      venueAddress,
      imageUrl,
      priceRange,
      classification,
      segment,
      genre,
      subGenre,
    } = body;

    // Validate required fields
    if (!title || !startDate || !location) {
      return NextResponse.json(
        { error: 'Title, start date, and location are required' },
        { status: 400 }
      );
    }

    // Validate date
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start date format' },
        { status: 400 }
      );
    }

    // Generate unique ID for custom events (ticketmaster_id is required and unique)
    // Format: "custom-{timestamp}-{random}" to distinguish from Ticketmaster events
    const customEventId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Create event data
    const eventData: any = {
      ticketmaster_id: customEventId, // Custom events use "custom-{uuid}" format
      title: title.trim(),
      description: description?.trim() || null,
      type: type || 'event',
      start_date: startDate,
      end_date: endDate || null,
      location: location.trim(),
      city: city?.trim() || null,
      country: null, // Can be added if needed
      venue_name: venueName?.trim() || null,
      venue_address: venueAddress?.trim() || null,
      image_url: imageUrl?.trim() || null,
      url: null, // Custom events don't have external URL
      price_range: priceRange || null,
      classification: classification || null,
      segment: segment || null,
      genre: genre || null,
      sub_genre: subGenre || null,
      created_by: user.id, // Track who created the event
    };

    const { data: newEvent, error: insertError } = await supabase
      .from('ticketmaster_events')
      .insert(eventData)
      .select()
      .single();

    if (insertError) {
      console.error('[Events API] Error creating event:', insertError);
      return NextResponse.json(
        { error: 'Failed to create event', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: newEvent,
      message: 'Event created successfully!',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Events API] Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
}

