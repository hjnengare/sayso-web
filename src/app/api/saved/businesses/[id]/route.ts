import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/saved/businesses/[id]
 * Check if business is saved
 */
export const GET = withUser(async (_req: NextRequest, { user, supabase, params }) => {
  try {
    const { id } = await (params as RouteContext['params']);

    const { data: saved, error: savedError } = await supabase
      .from('saved_businesses')
      .select('id, user_id, business_id, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('business_id', id)
      .maybeSingle();

    if (savedError) {
      console.error('Error checking saved status:', savedError);
      return NextResponse.json(
        { error: 'Failed to check saved status', details: savedError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, isSaved: !!saved, saved: saved || null });
  } catch (error) {
    console.error('Error in GET /api/saved/businesses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * DELETE /api/saved/businesses/[id]
 * Remove business from saved list
 */
export const DELETE = withUser(async (_req: NextRequest, { user, supabase, params }) => {
  try {
    const { id } = await (params as RouteContext['params']);

    const { error: deleteError } = await supabase
      .from('saved_businesses')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', id);

    if (deleteError) {
      console.error('Error unsaving business:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unsave business', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Business unsaved successfully', isSaved: false });
  } catch (error) {
    console.error('Error in DELETE /api/saved/businesses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
