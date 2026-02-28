import { getServiceSupabase } from '@/app/lib/admin';

/**
 * All supported notification types.
 * Must stay in sync with the DB CHECK constraint on notifications.type.
 */
export type NotificationType =
  | 'review'
  | 'business'
  | 'user'
  | 'highlyRated'
  | 'message'
  | 'otp_sent'
  | 'otp_verified'
  | 'claim_status_changed'
  | 'docs_requested'
  | 'docs_received'
  | 'gamification'
  | 'badge_earned'
  | 'review_helpful'
  | 'business_approved'
  | 'claim_approved'
  | 'comment_reply'
  | 'photo_approved'
  | 'milestone_achievement'
  | 'event_reminder';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: string;
  link?: string;
  image?: string;
  imageAlt?: string;
}

interface NotifyReplyRecipientsParams {
  reviewId: string;
  replyId: string;
  replierId: string;
  replierName: string;
}

/**
 * Centralized server-side notification creation helper.
 * Uses service role client to bypass RLS.
 * Prevents duplicates when entityId is provided (checks user_id + type + entity_id).
 * Returns the notification ID, or null if duplicate/skipped.
 */
export async function createNotification(params: CreateNotificationParams): Promise<string | null> {
  const supabase = getServiceSupabase();

  // Duplicate check when entityId is provided
  if (params.entityId) {
    const { data: existing } = await (supabase as any)
      .from('notifications')
      .select('id')
      .eq('user_id', params.userId)
      .eq('type', params.type)
      .eq('entity_id', params.entityId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }
  }

  const { data, error } = await (supabase as any)
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entity_id: params.entityId || null,
      link: params.link || null,
      image: params.image || null,
      image_alt: params.imageAlt || null,
      read: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Notifications] Failed to create notification:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Notify a business owner that their business has been approved.
 */
export async function notifyBusinessApproved(ownerId: string, businessId: string, businessName: string) {
  return createNotification({
    userId: ownerId,
    type: 'business_approved',
    title: 'Business Approved!',
    message: `Your business "${businessName}" has been approved and is now live on Sayso!`,
    entityId: businessId,
    link: `/my-businesses/${businessId}`,
  });
}

/**
 * Notify a claimant that their business claim has been approved.
 */
export async function notifyClaimApproved(claimantId: string, businessId: string, businessName: string, claimId?: string) {
  return createNotification({
    userId: claimantId,
    type: 'claim_approved',
    title: 'Claim Approved!',
    message: `Your business claim for "${businessName}" has been approved! You can now manage your business.`,
    entityId: claimId || businessId,
    link: `/my-businesses/${businessId}`,
  });
}

/**
 * Notify a review author that someone replied to their review.
 * Skips if the replier is the review author (no self-notification).
 */
export async function notifyCommentReply(
  reviewAuthorId: string,
  replierId: string,
  replyId: string,
  replierName: string,
  businessSlug?: string,
) {
  if (reviewAuthorId === replierId) return null;

  return createNotification({
    userId: reviewAuthorId,
    type: 'comment_reply',
    title: 'New Reply',
    message: `${replierName} replied to your review`,
    entityId: replyId,
    link: businessSlug ? `/business/${businessSlug}` : '/profile',
  });
}

/**
 * Fan out notifications for a newly created review reply.
 * Source of truth lives in API; this helper ensures deterministic recipients:
 * - Review author gets `comment_reply`
 * - Business owner gets `review`
 */
export async function notifyReplyRecipients(params: NotifyReplyRecipientsParams) {
  const supabase = getServiceSupabase();

  const { data: review, error: reviewError } = await (supabase as any)
    .from('reviews')
    .select('id, user_id, business_id')
    .eq('id', params.reviewId)
    .maybeSingle();

  if (reviewError || !review) {
    console.error('[Notifications] notifyReplyRecipients failed to resolve review:', reviewError);
    return { authorNotificationId: null, ownerNotificationId: null };
  }

  const { data: business, error: businessError } = await (supabase as any)
    .from('businesses')
    .select('id, name, slug, owner_id')
    .eq('id', review.business_id)
    .maybeSingle();

  if (businessError || !business) {
    console.error('[Notifications] notifyReplyRecipients failed to resolve business:', businessError);
    return { authorNotificationId: null, ownerNotificationId: null };
  }

  const reviewAuthorId = review.user_id ? String(review.user_id) : null;
  const businessOwnerId = business.owner_id ? String(business.owner_id) : null;
  const businessId = String(business.id || review.business_id);
  const businessName = String(business.name || 'this business');
  const replierName = params.replierName?.trim() || 'Someone';
  const authorLink = business.slug ? `/business/${business.slug}` : `/business/${businessId}`;
  const ownerLink = `/my-businesses/businesses/${businessId}/reviews`;

  let authorNotificationId: string | null = null;
  let ownerNotificationId: string | null = null;

  // Review author notification (comment_reply), unless self-reply
  if (reviewAuthorId && reviewAuthorId !== params.replierId) {
    authorNotificationId = await createNotification({
      userId: reviewAuthorId,
      type: 'comment_reply',
      title: 'New Reply',
      message: `${replierName} replied to your review`,
      entityId: `reply:${params.replyId}:author`,
      link: authorLink,
      image: '/png/restaurants.png',
      imageAlt: 'Comment reply',
    });
  }

  // Business owner notification (review), with dedupe + self/overlap guards
  if (
    businessOwnerId &&
    businessOwnerId !== params.replierId &&
    businessOwnerId !== reviewAuthorId
  ) {
    ownerNotificationId = await createNotification({
      userId: businessOwnerId,
      type: 'review',
      title: 'Reply on Review',
      message: `${replierName} replied to a review on ${businessName}`,
      entityId: `reply:${params.replyId}:owner`,
      link: ownerLink,
      image: '/png/restaurants.png',
      imageAlt: 'Reply on review',
    });
  }

  return { authorNotificationId, ownerNotificationId };
}

/**
 * Notify a user that their uploaded photo has been approved.
 */
export async function notifyPhotoApproved(uploaderId: string, entityId: string, businessName?: string) {
  return createNotification({
    userId: uploaderId,
    type: 'photo_approved',
    title: 'Photo Approved',
    message: businessName
      ? `Your photo for "${businessName}" has been approved and is now visible!`
      : 'Your photo has been approved and is now visible!',
    entityId,
  });
}

/**
 * Notify a user of a milestone achievement.
 * entityId is constructed as `{milestoneType}_{value}` to prevent duplicates.
 */
export async function notifyMilestone(
  userId: string,
  milestoneType: string,
  milestoneValue: number,
  title?: string,
  message?: string,
) {
  return createNotification({
    userId,
    type: 'milestone_achievement',
    title: title || 'Milestone Reached!',
    message: message || `You've reached a new milestone: ${milestoneValue} ${milestoneType}`,
    entityId: `${milestoneType}_${milestoneValue}`,
    link: '/profile',
  });
}

