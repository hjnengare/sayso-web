import { NextRequest, NextResponse } from "next/server";
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/search/saved
 * Save a search with user-defined name and query parameters
 */
export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = await req.json();
    const { name, params } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!params || typeof params !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'params is required and must be an object' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({ user_id: user.id, name: name.trim(), params })
      .select()
      .single();

    if (error) {
      console.error('[SAVED SEARCHES API] Error saving search:', error);
      return NextResponse.json(
        { error: 'Failed to save search', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { id: data.id, name: data.name, params: data.params, created_at: data.created_at, updated_at: data.updated_at },
    });
  } catch (error) {
    console.error('[SAVED SEARCHES API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/search/saved
 * Get saved searches for the authenticated user
 */
export const GET = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

    const { data, error } = await supabase
      .from('saved_searches')
      .select('id, name, params, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[SAVED SEARCHES API] Error fetching saved searches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch saved searches', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [], meta: { count: data?.length || 0, limit, offset } });
  } catch (error) {
    console.error('[SAVED SEARCHES API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
