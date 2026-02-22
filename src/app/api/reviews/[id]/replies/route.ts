import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { isOptimisticId, isValidUUID } from '../../../../lib/utils/validation';

type RouteContext = { params: Promise<{ id: string }> };

type ReplyNotificationFallbackArgs = {
  reviewOwnerId: string;
  replierId: string;
  replyId: string;
  replierName: string;
  businessSlug: string | null;
};

function isInvalidReviewId(reviewId: string): boolean {
  return isOptimisticId(reviewId) || !isValidUUID(reviewId);
}

function isMissingCommentReplyNotificationRpc(error: any): boolean {
  const code = typeof error?.code === 'string' ? error.code : '';
  const message = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return (
    code === '42883' ||
    code === 'PGRST202' ||
    (message.includes('create_comment_reply_notification') && message.includes('does not exist')) ||
    message.includes('could not find the function public.create_comment_reply_notification')
  );
}

async function createReplyNotificationFallback(args: ReplyNotificationFallbackArgs): Promise<void> {
  if (args.reviewOwnerId === args.replierId) return;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Reply Create] Notification fallback skipped: missing Supabase env config');
    return;
  }
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: existing, error: existingError } = await adminSupabase
    .from('notifications')
    .select('id')
    .eq('user_id', args.reviewOwnerId)
    .eq('type', 'comment_reply')
    .eq('entity_id', args.replyId)
    .limit(1)
    .maybeSingle();
  if (existingError) { console.error('[Reply Create] Notification fallback dedupe check failed:', existingError); return; }
  if (existing?.id) return;
  const link = args.businessSlug ? `/business/${args.businessSlug}` : '/profile';
  const { error: insertError } = await adminSupabase.from('notifications').insert({
    user_id: args.reviewOwnerId, type: 'comment_reply', title: 'New Reply',
    message: `${args.replierName} replied to your review`,
    image: '/png/restaurants.png', image_alt: 'Comment reply', link,
    entity_id: args.replyId, read: false,
  });
  if (insertError) console.error('[Reply Create] Notification fallback insert failed:', insertError);
}

function transformReply(reply: any) {
  const profile = Array.isArray(reply.profile) ? reply.profile[0] : reply.profile;
  return {
    id: reply.id,
    review_id: reply.review_id,
    user_id: reply.user_id,
    content: reply.content,
    created_at: reply.created_at,
    updated_at: reply.updated_at,
    user: {
      id: profile?.user_id || reply.user_id,
      name: profile?.display_name || profile?.username || 'User',
      avatar_url: profile?.avatar_url,
    },
  };
}

/**
 * GET /api/reviews/[id]/replies
 * Get all replies for a review — public
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const reviewId = (id || '').trim();
  if (isInvalidReviewId(reviewId)) return NextResponse.json({ replies: [], optimistic: true });
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('review_replies')
      .select(`*, profile:profiles!review_replies_user_id_fkey (user_id, display_name, username, avatar_url)`)
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching replies:', error);
      return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }
    return NextResponse.json({ replies: (data || []).map(transformReply) });
  } catch (err) {
    console.error('GET /reviews/[id]/replies unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

/**
 * POST /api/reviews/[id]/replies
 * Create a reply to a review — requires auth
 */
export const POST = withUser(async (req: NextRequest, { user, supabase, params }) => {
  const { id } = await (params as RouteContext['params']);
  const reviewId = (id || '').trim();
  if (isInvalidReviewId(reviewId)) {
    return NextResponse.json({ error: 'Review is still syncing. Please try again in a moment.', optimistic: true }, { status: 400 });
  }
  try {
    const { content } = await req.json();
    if (!content || !content.trim()) return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    const { data: review, error: reviewError } = await supabase.from('reviews').select('id').eq('id', reviewId).single();
    if (reviewError || !review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    const { data: reply, error: insertError } = await supabase
      .from('review_replies')
      .insert({ review_id: reviewId, user_id: user.id, content: content.trim() })
      .select(`*, profile:profiles!review_replies_user_id_fkey (user_id, display_name, username, avatar_url)`)
      .single();
    if (insertError) {
      console.error('Error creating reply:', insertError);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }
    const transformedReply = transformReply(reply);
    const profile = Array.isArray(reply.profile) ? reply.profile[0] : reply.profile;
    try {
      const { data: reviewOwner } = await supabase.from('reviews').select('user_id, business_id').eq('id', reviewId).maybeSingle();
      if (reviewOwner && reviewOwner.user_id !== user.id) {
        const { data: businessData } = await supabase.from('businesses').select('slug').eq('id', reviewOwner.business_id).maybeSingle();
        const replierName = profile?.display_name || profile?.username || 'Someone';
        const replyId = String(reply.id);
        const rpcPayload = {
          p_review_owner_id: reviewOwner.user_id, p_replier_id: user.id, p_review_id: reviewId,
          p_reply_id: replyId, p_replier_name: replierName, p_business_slug: businessData?.slug || null,
        };
        const { error: notificationError } = await supabase.rpc('create_comment_reply_notification', rpcPayload);
        if (notificationError) {
          if (isMissingCommentReplyNotificationRpc(notificationError)) {
            console.warn('[Reply Create] create_comment_reply_notification RPC missing; using fallback insert');
            await createReplyNotificationFallback({ reviewOwnerId: reviewOwner.user_id, replierId: user.id, replyId, replierName, businessSlug: businessData?.slug || null });
          } else {
            console.error('[Reply Create] Failed to create notification:', notificationError);
          }
        }
      }
    } catch (notifError) { console.error('[Reply Create] Failed to create notification:', notifError); }
    try {
      const { revalidatePath } = await import('next/cache');
      const { data: reviewData } = await supabase.from('reviews').select('business_id').eq('id', reviewId).maybeSingle();
      if (reviewData?.business_id) {
        const { data: businessRow } = await supabase.from('businesses').select('id, slug').eq('id', reviewData.business_id).maybeSingle();
        if (businessRow) revalidatePath(`/business/${businessRow.slug || businessRow.id}`);
      }
    } catch (revalErr) { console.warn('[Reply Create] Revalidation error:', revalErr); }
    return NextResponse.json({ reply: transformedReply }, { status: 201 });
  } catch (err) {
    console.error('POST /reviews/[id]/replies unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
});

/**
 * PUT /api/reviews/[id]/replies
 * Update a reply — requires auth
 */
export const PUT = withUser(async (req: NextRequest, { user, supabase, params }) => {
  const { id } = await (params as RouteContext['params']);
  const reviewId = (id || '').trim();
  if (isInvalidReviewId(reviewId)) {
    return NextResponse.json({ error: 'Review is still syncing. Please try again in a moment.', optimistic: true }, { status: 400 });
  }
  try {
    const { replyId, content } = await req.json();
    if (!content || !content.trim()) return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    const { data: existingReply, error: checkError } = await supabase
      .from('review_replies')
      .select('user_id, review_id')
      .eq('id', replyId)
      .eq('review_id', reviewId)
      .single();
    if (checkError || !existingReply) return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    if (existingReply.user_id !== user.id) return NextResponse.json({ error: 'You can only edit your own replies' }, { status: 403 });
    const { data: reply, error: updateError } = await supabase
      .from('review_replies')
      .update({ content: content.trim(), updated_at: new Date().toISOString() })
      .eq('id', replyId)
      .eq('user_id', user.id)
      .select(`*, profile:profiles!review_replies_user_id_fkey (user_id, display_name, username, avatar_url)`)
      .single();
    if (updateError) {
      console.error('Error updating reply:', updateError);
      return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 });
    }
    try {
      const { revalidatePath } = await import('next/cache');
      const { data: reviewData } = await supabase.from('reviews').select('business_id').eq('id', reviewId).maybeSingle();
      if (reviewData?.business_id) {
        const { data: businessRow } = await supabase.from('businesses').select('id, slug').eq('id', reviewData.business_id).maybeSingle();
        if (businessRow) revalidatePath(`/business/${businessRow.slug || businessRow.id}`);
      }
    } catch (revalErr) { console.warn('[Reply Update] Revalidation error:', revalErr); }
    return NextResponse.json({ reply: transformReply(reply) });
  } catch (err) {
    console.error('PUT /reviews/[id]/replies unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
});

/**
 * DELETE /api/reviews/[id]/replies
 * Delete a reply — requires auth
 */
export const DELETE = withUser(async (req: NextRequest, { user, supabase, params }) => {
  const { id } = await (params as RouteContext['params']);
  const reviewId = (id || '').trim();
  if (isInvalidReviewId(reviewId)) {
    return NextResponse.json({ error: 'Review is still syncing. Please try again in a moment.', optimistic: true }, { status: 400 });
  }
  try {
    const { replyId } = await req.json();
    const { data: existingReply, error: checkError } = await supabase
      .from('review_replies').select('user_id, review_id').eq('id', replyId).eq('review_id', reviewId).single();
    if (checkError || !existingReply) return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    if (existingReply.user_id !== user.id) return NextResponse.json({ error: 'You can only delete your own replies' }, { status: 403 });
    const { error: deleteError } = await supabase.from('review_replies').delete().eq('id', replyId).eq('user_id', user.id);
    if (deleteError) {
      console.error('Error deleting reply:', deleteError);
      return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 });
    }
    try {
      const { revalidatePath } = await import('next/cache');
      const { data: reviewData } = await supabase.from('reviews').select('business_id').eq('id', reviewId).maybeSingle();
      if (reviewData?.business_id) {
        const { data: businessRow } = await supabase.from('businesses').select('id, slug').eq('id', reviewData.business_id).maybeSingle();
        if (businessRow) revalidatePath(`/business/${businessRow.slug || businessRow.id}`);
      }
    } catch (revalErr) { console.warn('[Reply Delete] Revalidation error:', revalErr); }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /reviews/[id]/replies unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
});
