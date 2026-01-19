import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

/**
 * POST /api/businesses/[id]/events
 * Create a new event/special for a business (business owner only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const businessId = params.id;
    const supabase = await getServerSupabase();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this business' },
        { status: 403 }
      );
    }

    // Parse event data
    const body = await req.json();
    const { title, type, startDate, endDate, location, description, icon, image, price } = body;

    if (!title || !type || !startDate || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: title, type, startDate, location' },
        { status: 400 }
      );
    }

    // Insert event
    const { data, error } = await supabase
      .from('events_and_specials')
      .insert([
        {
          title,
          type,
          business_id: businessId,
          start_date: startDate,
          end_date: endDate,
          location,
          description,
          icon,
          image,
          price,
          created_by: user.id,
          rating: 0,
        }
      ])
      .select();

    if (error) {
      console.error('[Events API] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data?.[0] }, { status: 201 });
  } catch (error) {
    console.error('[Events API] Error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

/**
 * GET /api/businesses/[id]/events
 * Get all events for a specific business
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const businessId = params.id;
    // Use request-scoped client to properly read cookies for RLS
    const supabase = await getServerSupabase(req);

    const { data, error } = await supabase
      .from('events_and_specials')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Events API] Query error:', error);
      // Gracefully return empty list on query error to avoid client fetch failures
      return NextResponse.json({ success: true, data: [], error: error.message });
    }

    // Fetch business images for context
    const { data: businessImages } = await supabase
      .from('business_images')
      .select('image_url')
      .eq('business_id', businessId);

    // Transform to frontend format with business images
    const events = (data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      image: e.image,
      alt: `${e.title} event`,
      icon: e.icon,
      location: e.location,
      rating: e.rating || 0,
      startDate: e.start_date,
      endDate: e.end_date,
      price: e.price,
      description: e.description,
      businessId: e.business_id,
      businessImages: (businessImages || []).map((img: any) => img.image_url),
      createdBy: e.created_by,
      createdAt: e.created_at,
      isBusinessOwned: true,
     bookingUrl: e.booking_url,
     bookingContact: e.booking_contact,
    }));
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('[Events API] Error:', error);
    // Gracefully return empty list on unexpected errors
    return NextResponse.json({ success: true, data: [], error: 'Failed to fetch events' });
  }
}

/**
 * PUT /api/businesses/[id]/events/[eventId]
 * Update an event/special (business owner only)
 * NOTE: eventId is passed as query parameter: /api/businesses/[id]/events?eventId=xxx
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const businessId = params.id;
    const eventId = req.nextUrl.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this business' },
        { status: 403 }
      );
    }

    // Verify event ownership
    const { data: event, error: eventError } = await supabase
      .from('events_and_specials')
      .select('id, business_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.business_id !== businessId) {
      return NextResponse.json(
        { error: 'Event does not belong to this business' },
        { status: 400 }
      );
    }

    // Parse update data
    const body = await req.json();
    const { title, type, startDate, endDate, location, description, icon, image, price } = body;

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (image !== undefined) updateData.image = image;
    if (price !== undefined) updateData.price = price;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields provided to update' },
        { status: 400 }
      );
    }

    // Update event
    const { data, error } = await supabase
      .from('events_and_specials')
      .update(updateData)
      .eq('id', eventId)
      .select();

    if (error) {
      console.error('[Events API] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error) {
    console.error('[Events API] Error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

/**
 * DELETE /api/businesses/[id]/events/[eventId]
 * Delete an event/special (business owner only)
 * NOTE: eventId is passed as query parameter: /api/businesses/[id]/events?eventId=xxx
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const businessId = params.id;
    const eventId = req.nextUrl.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this business' },
        { status: 403 }
      );
    }

    // Verify event ownership
    const { data: event, error: eventError } = await supabase
      .from('events_and_specials')
      .select('id, business_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.business_id !== businessId) {
      return NextResponse.json(
        { error: 'Event does not belong to this business' },
        { status: 400 }
      );
    }

    // Delete event
    const { error } = await supabase
      .from('events_and_specials')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('[Events API] Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('[Events API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
