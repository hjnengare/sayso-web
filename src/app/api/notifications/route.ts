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
 * GET /api/notifications
 * Fetch notifications for the authenticated user
 */
export const GET = withUser(async (req: NextRequest, { user, supabase }) => {
  const endpoint = '/api/notifications';
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_role')
      .eq('user_id', user.id)
      .maybeSingle<ProfileRoleRow>();

    if (profileError) {
      console.error('[NotificationsAPI] Profile lookup failed', {
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

    if (isBusinessOwnerRole(profile)) {
      return NextResponse.json(
        { error: 'Business account should use /api/notifications/business' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const unreadParam = searchParams.get('unread');
    const typeParam = searchParams.get('type');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id);

    // Filter by read status
    if (unreadParam !== null) {
      const unread = unreadParam === 'true';
      query = query.eq('read', !unread);
    }

    // Filter by type
    if (typeParam) {
      const validTypes = ['review', 'business', 'user', 'highlyRated', 'gamification', 'message', 'otp_sent', 'otp_verified', 'claim_status_changed', 'docs_requested', 'docs_received', 'badge_earned', 'review_helpful', 'business_approved', 'claim_approved', 'comment_reply', 'photo_approved', 'milestone_achievement'];
      if (validTypes.includes(typeParam)) {
        query = query.eq('type', typeParam);
      }
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    // Apply pagination (limit and offset)
    const limit = limitParam ? parseInt(limitParam, 10) : null;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    if (limit && !isNaN(limit) && limit > 0) {
      const end = offset + limit - 1;
      query = query.range(offset, end);
    } else if (offset > 0) {
      // If only offset is provided, use a large range
      query = query.range(offset, offset + 999);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      );
    }

    // Count unread notifications
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return NextResponse.json({
      notifications: notifications || [],
      count: notifications?.length || 0,
      unreadCount: unreadCount || 0
    });
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * POST /api/notifications
 * Create a new notification for a user
 */
export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = await req.json();
    const {
      user_id: targetUserId,
      type,
      message,
      title,
      image,
      image_alt,
      link
    } = body;

    // Validate required fields
    if (!type || !message || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: type, message, and title are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['review', 'business', 'user', 'highlyRated', 'gamification', 'message', 'otp_sent', 'otp_verified', 'claim_status_changed', 'docs_requested', 'docs_received', 'badge_earned', 'review_helpful', 'business_approved', 'claim_approved', 'comment_reply', 'photo_approved', 'milestone_achievement'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Use target user_id if provided, otherwise use authenticated user
    const notificationUserId = targetUserId || user.id;

    // Only allow users to create notifications for themselves unless they're creating for another user
    // (In production, you might want to add admin checks here)
    if (targetUserId && targetUserId !== user.id) {
      // For now, allow it but you might want to restrict this
      // You could add an admin check here
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notificationUserId,
        type,
        message,
        title,
        image: image || null,
        image_alt: image_alt || null,
        link: link || null,
        read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json(
        { error: 'Failed to create notification', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notification
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});


