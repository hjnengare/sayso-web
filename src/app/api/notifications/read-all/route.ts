import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user
 */
export const PATCH = withUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: now })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark all notifications as read', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error in PATCH /api/notifications/read-all:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
