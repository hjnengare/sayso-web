import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/search/history
 * Get search history for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to view search history' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

    // Fetch search history
    const { data, error } = await supabase
      .from('search_history')
      .select('id, query, lat, lng, radius_km, sort, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[SEARCH HISTORY API] Error fetching search history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch search history', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      meta: {
        count: data?.length || 0,
        limit,
        offset,
      },
    });

  } catch (error) {
    console.error('[SEARCH HISTORY API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

