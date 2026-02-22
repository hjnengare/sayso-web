import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';

type ProfileRoleRow = {
  role?: string | null;
  account_role?: string | null;
};

function hasBusinessNotificationsAccess(profile: ProfileRoleRow | null): boolean {
  const accountRole = String(profile?.account_role ?? '').toLowerCase().trim();
  const role = String(profile?.role ?? '').toLowerCase().trim();
  if (accountRole) return accountRole === 'business_owner';
  return role === 'business_owner' || role === 'both';
}

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
        { error: 'Failed to validate business account' },
        { status: 500 }
      );
    }

    if (!hasBusinessNotificationsAccess(profile)) {
      console.error('[BusinessNotificationsAPI] Forbidden non-business request', {
        endpoint,
        status: 403,
        errorCode: 'FORBIDDEN_ROLE',
        errorMessage: 'Business account required',
        hasSession: true,
      });
      return NextResponse.json(
        { error: 'Business account required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const unreadParam = searchParams.get('unread');
    const limitParam  = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (unreadParam !== null) {
      query = query.eq('read', unreadParam !== 'true');
    }

    const limit  = limitParam  ? Math.max(1, parseInt(limitParam,  10)) : 50;
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;
    query = query.range(offset, offset + limit - 1);

    const { data: items, error: fetchError } = await query;
    if (fetchError) {
      console.error('[BusinessNotificationsAPI] Failed to fetch notifications', fetchError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return NextResponse.json({ items: items ?? [], unreadCount: unreadCount ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[BusinessNotificationsAPI] Unexpected error', {
      endpoint,
      status: 500,
      errorCode: 'UNEXPECTED_ERROR',
      errorMessage: message,
      hasSession: null,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
