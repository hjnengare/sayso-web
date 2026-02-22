import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/mark-read
 * Mark specific notifications as read.
 * Body: { ids: string[] }
 */
export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: now })
      .eq('user_id', user.id)
      .in('id', ids)
      .eq('read', false);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark notifications as read', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error in POST /api/notifications/mark-read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
