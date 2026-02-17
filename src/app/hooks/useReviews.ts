'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useEmailVerification } from './useEmailVerification';
import type { ReviewWithUser } from '../lib/types/database';
import {
  DUMMY_REVIEWS,
  simulateDelay,
  getReviewsByBusinessId,
  type Review
} from '../lib/dummyData';
interface ReviewFormData {
  business_id: string;
  rating: number;
  title?: string;
  content: string;
  tags: string[];
  images?: File[];
}

// ============================================================================
// Error Code to Message Mapping (fallback if API doesn't provide message)
// ============================================================================
const REVIEW_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "You can post as Anonymous, or sign in for a verified profile review.",
  EMAIL_NOT_VERIFIED: "Please verify your email to submit reviews.",
  MISSING_FIELDS: "Please fill in all required fields.",
  INVALID_RATING: "Please select a rating (1-5 stars).",
  CONTENT_TOO_SHORT: "Your review is too short. Please write at least 10 characters.",
  CONTENT_TOO_LONG: "Your review is too long. Please keep it under 5000 characters.",
  TITLE_TOO_LONG: "Review title is too long. Please keep it under 100 characters.",
  VALIDATION_FAILED: "Please check your review and try again.",
  CONTENT_MODERATION_FAILED: "Your review contains content that doesn't meet our guidelines. Please revise.",
  BUSINESS_NOT_FOUND: "We couldn't find that business. Please try again.",
  EVENT_NOT_FOUND: "We couldn't find that event. It may have been removed.",
  SPECIAL_NOT_FOUND: "We couldn't find that special. It may have expired.",
  DUPLICATE_REVIEW: "You've already reviewed this. You can edit your existing review instead.",
  DUPLICATE_ANON_REVIEW: "You already posted an anonymous review for this item on this device.",
  RATE_LIMITED: "Too many anonymous reviews in a short time. Please try again later.",
  SPAM_DETECTED: "This review was flagged as spam-like. Please adjust wording and try again.",
  RLS_BLOCKED: "We couldn't save your review right now. Please try again.",
  DB_ERROR: "We couldn't save your review. Please try again.",
  IMAGE_UPLOAD_FAILED: "Some images couldn't be uploaded. Your review was saved.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
};

function getReviewErrorMessage(result: { message?: string; code?: string; error?: string; details?: string }): string {
  // Prefer explicit message from API
  if (result.message) return result.message;
  // Fall back to code mapping
  if (result.code && REVIEW_ERROR_MESSAGES[result.code]) {
    return REVIEW_ERROR_MESSAGES[result.code];
  }
  // Legacy error/details fields
  if (result.details && typeof result.details === 'string') return result.details;
  if (result.error) return result.error;
  // Ultimate fallback
  return "An error occurred. Please try again.";
}

export function useReviews(businessId?: string) {
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchReviews = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/reviews?business_id=${businessId}&limit=50`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const result = await response.json();
        const rawReviews = result.reviews || [];
        
        // Transform reviews to match ReviewWithUser type - ensure user name is set
        const data = rawReviews.map((review: any) => {
          // Handle profile - it might be an object or array
          const profile = Array.isArray(review.profile) ? review.profile[0] : (review.profile || {});
          const displayName = profile?.display_name || profile?.username;
          
          return {
            ...review,
            user: {
              id: review.user_id || profile?.user_id || '',
              name: review.user_id ? (displayName || 'Anonymous') : 'Anonymous',
              avatar_url: profile?.avatar_url || undefined,
            },
            profile: profile, // Keep profile for backward compatibility
          };
        });

        if (mounted) {
          setReviews(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
          console.error('Error fetching reviews:', err);
          // Fallback to empty array
          setReviews([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      mounted = false;
    };
  }, [businessId]);

  const addOptimisticReview = (review: ReviewWithUser) => {
    setReviews(prev => [review, ...prev]);
  };

  const replaceOptimisticReview = (tempId: string, realReview: ReviewWithUser) => {
    setReviews(prev => prev.map(r => r.id === tempId ? realReview : r));
  };

  const removeReview = (reviewId: string) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  const refetch = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/reviews?business_id=${businessId}&limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to refetch reviews');
      }

      const result = await response.json();
      const rawReviews = result.reviews || [];
      
      // Transform reviews to match ReviewWithUser type - ensure user name is set
      const data = rawReviews.map((review: any) => {
        // Handle profile - it might be an object or array
        const profile = Array.isArray(review.profile) ? review.profile[0] : (review.profile || {});
        const displayName = profile?.display_name || profile?.username;
        
        return {
          ...review,
          user: {
            id: review.user_id || profile?.user_id || '',
            name: review.user_id ? (displayName || 'Anonymous') : 'Anonymous',
            avatar_url: profile?.avatar_url || undefined,
          },
          profile: profile, // Keep profile for backward compatibility
        };
      });
      
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refetch reviews');
      console.error('Error refetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    reviews,
    loading,
    error,
    refetch,
    addOptimisticReview,
    replaceOptimisticReview,
    removeReview,
  };
}

export function useRecentReviews(limit?: number) {
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchRecentReviews = async () => {
      try {
        setLoading(true);
        setError(null);

        await simulateDelay();
        // Get recent reviews (sorted by date) and transform to ReviewWithUser
        const data: ReviewWithUser[] = [...DUMMY_REVIEWS]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit || 10)
          .map(review => ({
            ...review,
            helpful_count: 0, // Add missing properties
            updated_at: review.created_at,
            user: {
              id: review.user_id,
              name: 'User',
            },
            images: review.images?.map((url, index) => ({
              id: `${review.id}-img-${index}`,
              review_id: review.id,
              image_url: url,
              created_at: review.created_at,
            })) || [],
          }));

        if (mounted) {
          setReviews(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch recent reviews');
          console.error('Error fetching recent reviews:', err);
          // Fallback to empty array
          setReviews([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchRecentReviews();

    return () => {
      mounted = false;
    };
  }, [limit]);

  return {
    reviews,
    loading,
    error,
    refetch: async () => {
      await simulateDelay();
      const data: ReviewWithUser[] = [...DUMMY_REVIEWS]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit || 10)
        .map(review => ({
          ...review,
          helpful_count: 0,
          updated_at: review.created_at,
          user: {
            id: review.user_id,
            name: 'User',
          },
          images: review.images?.map((url, index) => ({
            id: `${review.id}-img-${index}`,
            review_id: review.id,
            image_url: url,
            created_at: review.created_at,
          })) || [],
        }));
      setReviews(data);
    }
  };
}

export function useReviewSubmission() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading } = useAuth();
  const { showToast } = useToast();
  const { checkEmailVerification } = useEmailVerification();

  const submitReview = async (reviewData: ReviewFormData): Promise<{ success: boolean; review?: any }> => {
    // Wait for auth to finish loading (up to 2 seconds)
    let attempts = 0;
    while (isLoading && attempts < 4) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    // Get fresh user state - sometimes the context hasn't updated yet
    let currentUser = user;
    if (!currentUser) {
      // Try to get user from session directly
      try {
        const { AuthService } = await import('../lib/auth');
        currentUser = await AuthService.getCurrentUser();
        console.log('Fetched user directly from session:', currentUser ? { id: currentUser.id, email: currentUser.email } : null);
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    }

    // Check email verification if we have a user (guests can submit as Anonymous)
    if (currentUser && !currentUser.email_verified) {
      if (!checkEmailVerification('submit reviews')) {
        setError('You must verify your email to submit reviews');
        return { success: false };
      }
    }
    // When !currentUser, allow submission — API will accept as anonymous for business reviews

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('business_id', reviewData.business_id);
      formData.append('rating', reviewData.rating.toString());
      if (reviewData.title) {
        formData.append('title', reviewData.title);
      }
      formData.append('content', reviewData.content);
      reviewData.tags.forEach(tag => formData.append('tags', tag));
      if (reviewData.images?.length) {
        reviewData.images.forEach((image, index) => {
          const fileName = image.name && image.name.trim() ? image.name : `photo_${Date.now()}_${index}.jpg`;
          formData.append('images', image, fileName);
        });
      }

      let anonymousId: string | null = null;
      if (!currentUser) {
        const { getOrCreateAnonymousId } = await import('../lib/utils/anonymousClient');
        anonymousId = getOrCreateAnonymousId();
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: anonymousId ? { 'x-anonymous-id': anonymousId } : undefined,
        body: formData,
      });

      let result;
      try {
        result = await response.json();
      } catch {
        // JSON parsing failed
        const errorMessage = 'Something went wrong. Please try again.';
        setError(errorMessage);
        showToast(errorMessage, 'sage');
        return { success: false };
      }

      // Check for error responses (structured or legacy)
      if (!response.ok || result.success === false) {
        const errorMessage = getReviewErrorMessage(result);
        setError(errorMessage);
        showToast(errorMessage, 'sage');
        console.error('[Review Submit] Error:', result);
        return { success: false };
      }

      const createdReview = result.review || null;

      // Success! Trigger badge check so new badges are awarded and UI can show them
      if (currentUser?.id) {
        fetch('/api/badges/check-and-award', { method: 'POST', credentials: 'include' })
          .then((res) => res.json())
          .then((data) => {
            if (data?.newBadges?.length > 0) {
              const n = data.newBadges.length;
              showToast(
                n === 1
                  ? `You earned a new badge: ${data.newBadges[0].name}!`
                  : `You earned ${n} new badges!`,
                'success',
                4000
              );
            }
          })
          .catch(() => {});
      }
      showToast('Review submitted', 'sage', 3000);
      return { success: true, review: createdReview };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
      setError(errorMessage);
      showToast(errorMessage, 'sage');
      console.error('[Review Submit] Unexpected error:', err);
      return { success: false };
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = async (reviewId: string): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to delete a review');
      showToast('Log in to delete review', 'sage');
      return false;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete review');
      }

      showToast('Review deleted', 'sage', 2000);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete review';
      setError(errorMessage);
      showToast(errorMessage, 'sage');
      console.error('Error deleting review:', err);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const likeReview = async (reviewId: string): Promise<boolean | null> => {
    if (!user) {
      showToast('Log in to like reviews', 'sage');
      return null;
    }

    try {
      // Check current status first
      const statusRes = await fetch(`/api/reviews/${reviewId}/helpful`);
      const statusData = await statusRes.json();
      const isCurrentlyHelpful = statusData.helpful === true;

      // Toggle the vote
      const method = isCurrentlyHelpful ? 'DELETE' : 'POST';
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to toggle helpful vote');
      }

      const newStatus = result.helpful === true;
      showToast(
        newStatus ? 'Marked helpful' : 'Vote removed',
        'sage',
        2000
      );
      return newStatus;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to like review';
      showToast(errorMessage, 'sage');
      console.error('Error liking review:', err);
      return null;
    }
  };

  return {
    submitting,
    error,
    submitReview,
    deleteReview,
    likeReview
  };
}

export function useUserHasReviewed(businessId?: string) {
  // Multiple reviews per business are allowed, so always expose review actions
  const hasReviewed = false;
  const loading = false;
  const checkReview = useCallback(async () => undefined, []);

  return { hasReviewed, loading, refetch: checkReview };
}
