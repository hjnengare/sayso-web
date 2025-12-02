/**
 * User Service
 * Business logic for user profile operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  EnhancedProfile,
  UpdateProfilePayload,
  UserStats,
  UserActivityItem,
  UserReview,
  PaginationParams,
  PrivacySettings,
} from '../types/user';

// Helper to safely parse JSONB fields
function parseJsonbField<T>(value: any, defaultValue: T): T {
  if (!value) return defaultValue;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }
  return value as T;
}

/**
 * Get current user ID from Supabase auth
 */
export async function getCurrentUserId(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

/**
 * Update user's last_active_at timestamp
 */
export async function updateLastActive(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * Get full user profile with all enhancements
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<EnhancedProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  // Ensure default values for JSONB fields
  const socialLinks = parseJsonbField<Record<string, string>>(data.social_links, {});
  const privacySettings: PrivacySettings = {
    showActivity: true,
    showStats: true,
    showSavedBusinesses: false,
    ...parseJsonbField<Partial<PrivacySettings>>(data.privacy_settings, {}),
  };

  return {
    ...data,
    social_links: socialLinks,
    privacy_settings: privacySettings,
  } as EnhancedProfile;
}

/**
 * Update user profile fields
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: UpdateProfilePayload
): Promise<EnhancedProfile | null> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (payload.bio !== undefined) {
    updateData.bio = payload.bio || null;
  }
  if (payload.location !== undefined) {
    updateData.location = payload.location || null;
  }
  if (payload.website_url !== undefined) {
    updateData.website_url = payload.website_url || null;
  }
  if (payload.social_links !== undefined) {
    updateData.social_links = payload.social_links;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return getUserProfile(supabase, userId);
}

/**
 * Get user statistics
 */
export async function getUserStats(
  supabase: SupabaseClient,
  userId: string
): Promise<UserStats | null> {
  // Get profile for account creation date
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, last_active_at')
    .eq('id', userId)
    .single();

  if (!profile) {
    return null;
  }

  // Get total reviews written
  const { count: totalReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get total helpful votes given
  const { count: totalHelpfulVotes } = await supabase
    .from('review_helpful_votes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get total businesses saved
  const { count: totalSaved } = await supabase
    .from('saved_businesses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get helpful votes received (on user's reviews)
  const { data: userReviews } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', userId);

  let helpfulVotesReceived = 0;
  if (userReviews && userReviews.length > 0) {
    const reviewIds = userReviews.map((r) => r.id);
    const { count } = await supabase
      .from('review_helpful_votes')
      .select('*', { count: 'exact', head: true })
      .in('review_id', reviewIds);
    helpfulVotesReceived = count || 0;
  }

  return {
    totalReviewsWritten: totalReviews || 0,
    totalHelpfulVotesGiven: totalHelpfulVotes || 0,
    totalBusinessesSaved: totalSaved || 0,
    accountCreationDate: profile.created_at,
    lastActiveDate: profile.last_active_at || profile.created_at,
    helpfulVotesReceived,
  };
}

/**
 * Get user activity feed
 */
export async function getUserActivity(
  supabase: SupabaseClient,
  userId: string,
  params: PaginationParams = {}
): Promise<{ items: UserActivityItem[]; total: number }> {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100); // Max 100 per page
  const offset = (page - 1) * pageSize;

  const activities: UserActivityItem[] = [];

  // Get reviews
  const { data: reviews, count: reviewsCount } = await supabase
    .from('reviews')
    .select(
      `
      id,
      business_id,
      rating,
      title,
      content,
      created_at,
      businesses!inner(id, name, slug, image_url)
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (reviews) {
    reviews.forEach((review: any) => {
      activities.push({
        id: `review-${review.id}`,
        type: 'REVIEW',
        createdAt: review.created_at,
        metadata: {
          reviewId: review.id,
          businessId: review.business_id,
          businessName: review.businesses?.name,
          businessSlug: review.businesses?.slug,
          businessImage: review.businesses?.image_url,
          rating: review.rating,
          reviewTitle: review.title,
          reviewSnippet: review.content?.substring(0, 100),
        },
      });
    });
  }

  // Get saved businesses (within the same page range)
  const savedOffset = Math.max(0, offset - (reviewsCount || 0));
  const savedLimit = Math.max(0, pageSize - (reviews?.length || 0));

  let savedData: any[] = [];
  if (savedLimit > 0) {
    const { data: saved } = await supabase
      .from('saved_businesses')
      .select(
        `
        id,
        created_at,
        businesses!inner(id, name, slug, image_url)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(savedOffset, savedOffset + savedLimit - 1);

    if (saved) {
      savedData = saved;
      saved.forEach((save: any) => {
        activities.push({
          id: `save-${save.id}`,
          type: 'SAVE',
          createdAt: save.created_at,
          metadata: {
            businessId: save.businesses?.id,
            businessName: save.businesses?.name,
            businessSlug: save.businesses?.slug,
            businessImage: save.businesses?.image_url,
          },
        });
      });
    }
  }

  // Get helpful votes (if space remaining)
  const votesOffset = Math.max(
    0,
    offset - (reviewsCount || 0) - (savedData.length || 0)
  );
  const votesLimit = Math.max(
    0,
    pageSize - (reviews?.length || 0) - (savedData.length || 0)
  );

  if (votesLimit > 0) {
    const { data: votes } = await supabase
      .from('review_helpful_votes')
      .select(
        `
        created_at,
        reviews!inner(id, business_id, title, content, businesses!inner(id, name, slug, image_url))
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(votesOffset, votesOffset + votesLimit - 1);

    if (votes) {
      votes.forEach((vote: any) => {
        activities.push({
          id: `vote-${vote.reviews.id}`,
          type: 'HELPFUL_VOTE',
          createdAt: vote.created_at,
          metadata: {
            reviewId: vote.reviews.id,
            businessId: vote.reviews.business_id,
            businessName: vote.reviews.businesses?.name,
            businessSlug: vote.reviews.businesses?.slug,
            reviewTitle: vote.reviews.title,
            reviewSnippet: vote.reviews.content?.substring(0, 100),
          },
        });
      });
    }
  }

  // Sort all activities by created_at descending
  activities.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Get total count across all activity types
  const [reviewsTotal, savedTotal, votesTotal] = await Promise.all([
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('saved_businesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('review_helpful_votes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const total =
    (reviewsTotal.count || 0) +
    (savedTotal.count || 0) +
    (votesTotal.count || 0);

  return {
    items: activities.slice(0, pageSize),
    total,
  };
}

/**
 * Get user reviews with pagination
 */
export async function getUserReviews(
  supabase: SupabaseClient,
  userId: string,
  params: PaginationParams = {}
): Promise<{ reviews: UserReview[]; total: number }> {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 10, 100);
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from('reviews')
    .select(
      `
      id,
      business_id,
      rating,
      title,
      content,
      created_at,
      updated_at,
      helpful_count,
      businesses!inner(id, name, slug, image_url)
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return { reviews: [], total: 0 };
  }

  const reviews: UserReview[] =
    data?.map((review: any) => ({
      id: review.id,
      business_id: review.business_id,
      rating: review.rating,
      title: review.title,
      body: review.content,
      created_at: review.created_at,
      updated_at: review.updated_at,
      helpful_count: review.helpful_count || 0,
      business: review.businesses
        ? {
            id: review.businesses.id,
            name: review.businesses.name,
            slug: review.businesses.slug,
            image_url: review.businesses.image_url,
          }
        : undefined,
    })) || [];

  return {
    reviews,
    total: count || 0,
  };
}

