import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await getServerSupabase();
  const { user } = (await supabase.auth.getUser()).data || {};

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

  try {
    const { data, error } = await supabase
      .from('saved_specials')
      .select(`
        id,
        user_id,
        special_id,
        created_at,
        updated_at,
        events_and_specials (
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
          updated_at,
          businesses:business_id (
            id,
            name,
            slug,
            logo_url,
            address,
            phone,
            website,
            email
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('events_and_specials.type', 'special')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Handle table not existing or permission denied gracefully
      if (error.code === '42P01' || error.code === '42501' ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('permission denied')) {
        console.warn('[Saved Specials API] Table not accessible, returning empty:', error.message);
        return NextResponse.json({ specials: [] });
      }

      console.error('[Saved Specials API] Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch saved specials' }, { status: 500 });
    }

    // Transform data to match expected format
    const specials = (data || []).map((record: any) => {
      const special = record.events_and_specials;
      if (!special) return null;
      return {
        id: special.id,
        title: special.title,
        type: special.type,
        description: special.description,
        startDate: special.start_date,
        endDate: special.end_date,
        location: special.location,
        icon: special.icon,
        image: special.image,
        price: special.price,
        rating: special.rating,
        bookingUrl: special.booking_url,
        bookingContact: special.booking_contact,
        businessId: special.business_id,
        businessName: special.businesses?.name || '',
        savedAt: record.created_at,
      };
    }).filter(Boolean);

    return NextResponse.json({ specials });
  } catch (err: any) {
    // Handle any unexpected errors gracefully
    console.warn('[Saved Specials API] Unexpected error, returning empty:', err?.message);
    return NextResponse.json({ specials: [] });
  }
}

/**
 * POST /api/saved/specials
 * Save a special for the current user
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to save specials' },
        { status: 401 }
      );
    }

    const { special_id } = await req.json();

    if (!special_id) {
      return NextResponse.json(
        { error: 'Special ID is required' },
        { status: 400 }
      );
    }

    // Check if special exists
    const { data: special, error: specialError } = await supabase
      .from('events_and_specials')
      .select('id, title, type')
      .eq('id', special_id)
      .eq('type', 'special')
      .single();

    if (specialError || !special) {
      return NextResponse.json(
        { error: 'Special not found' },
        { status: 404 }
      );
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_specials')
      .select('id')
      .eq('user_id', user.id)
      .eq('special_id', special_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          message: 'Special already saved',
          isSaved: true
        },
        { status: 200 }
      );
    }

    // Save the special
    const { data: saved, error: saveError } = await supabase
      .from('saved_specials')
      .insert({
        user_id: user.id,
        special_id: special_id,
      })
      .select()
      .single();

    if (saveError) {
      // Handle unique constraint violation (already saved)
      if (saveError.code === '23505') {
        return NextResponse.json(
          {
            success: true,
            message: 'Special already saved',
            isSaved: true
          },
          { status: 200 }
        );
      }

      console.error('[Saved Specials API] Error saving special:', saveError);
      return NextResponse.json(
        { error: 'Failed to save special', details: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Special saved successfully',
      saved,
      isSaved: true,
    }, { status: 201 });
  } catch (error) {
    console.error('[Saved Specials API] Error in POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saved/specials?specialId=...
 * Remove a saved special for the current user
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to unsave specials' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const specialId = searchParams.get('specialId');

    if (!specialId) {
      return NextResponse.json(
        { error: 'Special ID is required' },
        { status: 400 }
      );
    }

    // Delete the saved special
    const { error: deleteError } = await supabase
      .from('saved_specials')
      .delete()
      .eq('user_id', user.id)
      .eq('special_id', specialId);

    if (deleteError) {
      console.error('[Saved Specials API] Error unsaving special:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unsave special', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Special unsaved successfully',
      isSaved: false,
    });
  } catch (error) {
    console.error('[Saved Specials API] Error in DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}