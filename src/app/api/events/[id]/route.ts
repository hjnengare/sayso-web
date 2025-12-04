import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[id]
 * Fetch a single event by ID (ticketmaster_id)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();

    const { data: event, error } = await supabase
      .from('ticketmaster_events')
      .select('*')
      .eq('ticketmaster_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
      console.error('[Events API] Error fetching event:', error);
      return NextResponse.json(
        { error: 'Failed to fetch event', details: error.message },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error('[Events API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}

