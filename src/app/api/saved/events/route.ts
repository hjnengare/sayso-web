import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import type { Event } from '@/app/lib/types/Event';

/**
 * Transform a ticketmaster_events or events_and_specials row to the Event interface
 */
function transformToEvent(row: any, savedAt?: string): Event {
  // Determine source based on data
  const isBusinessOwned = row.is_business_owned || row.business_id;
  const source = isBusinessOwned
    ? 'business'
    : row.ticketmaster_id?.startsWith('custom-')
      ? 'custom'
      : 'ticketmaster';

  // Determine href based on type
  const href = row.type === 'special'
    ? `/special/${row.id}`
    : `/event/${row.id}`;

  return {
    id: row.id,
    title: row.title || 'Untitled Event',
    type: row.type === 'special' ? 'special' : 'event',
    image: row.image_url || row.image || null,
    alt: row.title || 'Event image',
    location: row.location || row.venue_name || 'Location TBA',
    startDate: row.start_date ? new Date(row.start_date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) : 'TBA',
    endDate: row.end_date ? new Date(row.end_date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) : undefined,
    startDateISO: row.start_date,
    endDateISO: row.end_date,
    price: row.price_range || (row.price ? `R${row.price}` : null),
    description: row.description || null,
    bookingUrl: row.url || row.booking_url || null,
    bookingContact: row.booking_contact,
    source,
    ticketmaster_url: row.url,
    venueName: row.venue_name || row.business_name,
    venueAddress: row.venue_address || row.location,
    city: row.city,
    country: row.country,
    url: row.url || row.booking_url,
    segment: row.segment,
    genre: row.genre,
    subGenre: row.sub_genre,
    href,
    businessId: row.business_id,
    businessName: row.business_name,
    isBusinessOwned,
  };
}

/**
 * GET /api/saved/events
 * Returns the current user's saved events, joined with event data from ticketmaster_events table.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to view saved events' }, { status: 401 });
    }

    // Fetch saved events for the user
    console.log('[Saved Events API] Fetching saved events for user:', user.id);

    const { data: savedRecords, error: savedError } = await supabase
      .from('saved_events')
      .select('id, event_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('[Saved Events API] Saved records query result:', {
      count: savedRecords?.length,
      records: savedRecords,
      error: savedError
    });

    if (savedError) {
      // Check if it's a table/permission error
      if (savedError.code === '42P01' || savedError.code === '42501' ||
          savedError.message?.toLowerCase().includes('relation') ||
          savedError.message?.toLowerCase().includes('does not exist') ||
          savedError.message?.toLowerCase().includes('permission denied')) {
        console.warn('saved_events table not accessible');
        return NextResponse.json({ events: [], count: 0, eventIds: [] });
      }
      console.error('[Saved Events API] Error fetching saved events:', savedError);
      return NextResponse.json({ error: 'Failed to fetch saved events', details: savedError.message }, { status: 500 });
    }

    if (!savedRecords || savedRecords.length === 0) {
      console.log('[Saved Events API] No saved records found for user. Checking if table has any data...');
      // Debug: Check if table has any data at all (might be RLS blocking)
      const { count: totalCount } = await supabase
        .from('saved_events')
        .select('*', { count: 'exact', head: true });
      console.log('[Saved Events API] Total records in table (if RLS allows):', totalCount);
      return NextResponse.json({ events: [], count: 0, eventIds: [] });
    }

    // Get event details for each saved event from multiple tables
    const eventIds = savedRecords.map((r) => r.event_id);

    console.log('[Saved Events API] Looking up events with IDs:', eventIds);

    // Try to find events by UUID id first, then by ticketmaster_id
    // The event_id might be either the UUID or the ticketmaster_id depending on how it was saved
    let events: any[] = [];
    let eventsError: any = null;

    // First try ticketmaster_events by UUID id
    const { data: eventsByUuid, error: uuidError } = await supabase
      .from('ticketmaster_events')
      .select('*')
      .in('id', eventIds);

    console.log('[Saved Events API] Ticketmaster events by UUID result:', {
      count: eventsByUuid?.length,
      error: uuidError?.message,
    });

    if (eventsByUuid && eventsByUuid.length > 0) {
      events = [...events, ...eventsByUuid];
    }

    // Also try by ticketmaster_id for events saved by their TM id
    const remainingIds = eventIds.filter(id => !events.some(e => String(e.id) === String(id)));
    if (remainingIds.length > 0) {
      const { data: eventsByTmId, error: tmIdError } = await supabase
        .from('ticketmaster_events')
        .select('*')
        .in('ticketmaster_id', remainingIds);

      console.log('[Saved Events API] Ticketmaster events by ticketmaster_id result:', {
        count: eventsByTmId?.length,
        error: tmIdError?.message,
      });

      if (tmIdError) {
        console.warn('[Saved Events API] Error fetching by ticketmaster_id:', tmIdError.message);
      } else if (eventsByTmId && eventsByTmId.length > 0) {
        events = [...events, ...eventsByTmId];
      }
    }

    // Also check events_and_specials table for business-owned events and specials
    const stillRemainingIds = eventIds.filter(id =>
      !events.some(e => String(e.id) === String(id) || String(e.ticketmaster_id) === String(id))
    );
    if (stillRemainingIds.length > 0) {
      const { data: businessEvents, error: businessError } = await supabase
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
            slug
          )
        `)
        .in('id', stillRemainingIds);

      console.log('[Saved Events API] Business events/specials result:', {
        count: businessEvents?.length,
        error: businessError?.message,
      });

      if (businessError) {
        console.warn('[Saved Events API] Error fetching business events:', businessError.message);
      } else if (businessEvents && businessEvents.length > 0) {
        // Transform business events to match ticketmaster format
        const transformedBusinessEvents = businessEvents.map((e: any) => ({
          id: e.id,
          ticketmaster_id: null,
          title: e.title,
          type: e.type,
          description: e.description,
          start_date: e.start_date,
          end_date: e.end_date,
          location: e.location,
          city: null,
          country: null,
          venue_name: e.businesses?.name,
          venue_address: e.location,
          image_url: e.image,
          url: e.booking_url,
          price_range: e.price ? `R${e.price}` : null,
          segment: null,
          genre: null,
          sub_genre: null,
          // Additional business fields
          business_id: e.business_id,
          business_name: e.businesses?.name,
          business_slug: e.businesses?.slug,
          is_business_owned: true,
        }));
        events = [...events, ...transformedBusinessEvents];
      }
    }

    console.log('[Saved Events API] Final events found:', events.length);

    if (eventsError) {
      console.error('[Saved Events API] Error fetching event details:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch event details', details: eventsError.message }, { status: 500 });
    }

    // Transform to Event interface - include all events (don't filter expired for saved items)
    // Users should see their saved events even if they've passed
    const savedEvents: Event[] = (events || [])
      .map((event) => {
        // Compare as strings - event_id might match either id or ticketmaster_id
        const saved = savedRecords.find((r) =>
          String(r.event_id) === String(event.id) ||
          String(r.event_id) === String(event.ticketmaster_id)
        );
        return transformToEvent(event, saved?.created_at);
      });

    console.log('[Saved Events API] Transformed events:', savedEvents.length);

    return NextResponse.json({
      events: savedEvents,
      count: savedEvents.length,
      eventIds: eventIds,
    });
  } catch (error: any) {
    console.error('[Saved Events API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved/events
 * Saves an event for the current user.
 * Body: { event_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to save events' }, { status: 401 });
    }

    const body = await req.json();
    const eventId = body.event_id;

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid event_id' }, { status: 400 });
    }

    // Check if event exists in ticketmaster_events table
    const { data: existingEvent, error: eventCheckError } = await supabase
      .from('ticketmaster_events')
      .select('id')
      .eq('id', eventId)
      .single();

    if (eventCheckError || !existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('saved_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single();

    if (existingSave) {
      return NextResponse.json({ success: true, isSaved: true, message: 'Event already saved' });
    }

    // Save the event
    const { error: insertError } = await supabase
      .from('saved_events')
      .insert({
        user_id: user.id,
        event_id: eventId,
      });

    if (insertError) {
      console.error('[Saved Events API] Error saving event:', insertError);
      return NextResponse.json({ error: 'Failed to save event', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, isSaved: true });
  } catch (error: any) {
    console.error('[Saved Events API] Error saving event:', error);
    return NextResponse.json(
      { error: 'Failed to save event', details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saved/events?event_id=...
 * Removes a saved event for the current user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to unsave events' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('saved_events')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId);

    if (deleteError) {
      console.error('[Saved Events API] Error unsaving event:', deleteError);
      return NextResponse.json({ error: 'Failed to unsave event', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, isSaved: false });
  } catch (error: any) {
    console.error('[Saved Events API] Error unsaving event:', error);
    return NextResponse.json(
      { error: 'Failed to unsave event', details: error?.message },
      { status: 500 }
    );
  }
}
