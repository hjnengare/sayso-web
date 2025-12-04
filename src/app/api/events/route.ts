import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events
 * Fetch events from the ticketmaster_events table
 * 
 * Query parameters:
 * - limit: Number of events to return (default: 20)
 * - offset: Offset for pagination (default: 0)
 * - city: Filter by city
 * - segment: Filter by segment (e.g., 'Music', 'Sports')
 * - upcoming: Only return upcoming events (default: true)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { searchParams } = new URL(req.url);

    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const city = searchParams.get('city');
    const segment = searchParams.get('segment');
    const upcoming = searchParams.get('upcoming') !== 'false'; // Default to true

    let query = supabase
      .from('ticketmaster_events')
      .select('*', { count: 'exact' })
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
      query = query.gte('start_date', new Date().toISOString());
    }

    const { data: events, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Events API] Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: events || [],
      count: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[Events API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}

