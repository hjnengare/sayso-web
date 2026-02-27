import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';

type ProfileRoleRow = {
  role?: string | null;
  account_role?: string | null;
};

function isBusinessOwnerRole(profile: ProfileRoleRow | null): boolean {
  const role = String(profile?.account_role ?? profile?.role ?? '').toLowerCase().trim();
  return role === 'business_owner';
}

/**
 * GET /api/notifications/business
 * Fetch notifications for authenticated business scope only.
 */
export const GET = withUser(async (req: NextRequest, { user, supabase }) => {
  const endpoint = '/api/notifications/business';

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_role')
      .eq('user_id', user.id)
      .maybeSingle<ProfileRoleRow>();

    if (profileError) {
      console.error('[BusinessNotificationsAPI] Profile lookup failed', {
        endpoint,
        status: 500,
        errorCode: profileError.code ?? null,
        errorMessage: profileError.message,
        hasSession: true,
      });
      return NextResponse.json(
        { error: 'Failed to validate notification scope' },
        { status: 500 }
      );
    }

    if (!isBusinessOwnerRole(profile)) {
      return NextResponse.json(
        { error: 'Only business accounts can use /api/notifications/business' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const unreadParam = searchParams.get('unread');
    const typeParam = searchParams.get('type');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id);

    if (unreadParam !== null) {
      const unread = unreadParam === 'true';
      query = query.eq('read', !unread);
    }

    if (typeParam) {
      const validTypes = ['review', 'business', 'user', 'highlyRated', 'gamification', 'message', 'otp_sent', 'otp_verified', 'claim_status_changed', 'docs_requested', 'docs_received', 'badge_earned', 'review_helpful', 'business_approved', 'claim_approved', 'comment_reply', 'photo_approved', 'milestone_achievement'];
      if (validTypes.includes(typeParam)) {
        query = query.eq('type', typeParam);
      }
    }

    query = query.order('created_at', { ascending: false });

    const limit = limitParam ? parseInt(limitParam, 10) : null;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    if (limit && !Number.isNaN(limit) && limit > 0) {
      const end = offset + limit - 1;
      query = query.range(offset, end);
    } else if (offset > 0) {
      query = query.range(offset, offset + 999);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching business notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      );
    }

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return NextResponse.json({
      notifications: notifications || [],
      count: notifications?.length || 0,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/notifications/business:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

