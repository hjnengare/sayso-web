import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

/**
 * GET /api/saved/events/count
 * Get count of saved events for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to view saved events count' },
        { status: 401 }
      );
    }

    const { count, error: countError } = await supabase
      .from('saved_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      // Check if it's a table/permission error
      if (countError.code === '42P01' || countError.code === '42501' ||
          countError.message?.toLowerCase().includes('relation') ||
          countError.message?.toLowerCase().includes('does not exist') ||
          countError.message?.toLowerCase().includes('permission denied')) {
        console.warn('saved_events table not accessible');
        return NextResponse.json({ success: true, count: 0 });
      }
      console.error('Error fetching saved events count:', countError);
      return NextResponse.json(
        { error: 'Failed to fetch saved events count', details: countError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/saved/events/count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
