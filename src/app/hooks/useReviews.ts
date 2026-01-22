'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useEmailVerification } from './useEmailVerification';
import {
  DUMMY_REVIEWS,
  simulateDelay,
  getReviewsByBusinessId,
  type Review
} from '../lib/dummyData';

// Use Review type as ReviewWithUser for dummy data
type ReviewWithUser = Review;
interface ReviewFormData {
  business_id: string;
  rating: number;
  title?: string;
  content: string;
  tags: string[];
  images?: File[];
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
          
          // Debug logging
          if (!displayName) {
            console.warn('Review missing user name:', {
              review_id: review.id,
              user_id: review.user_id,
              profile: profile
            });
          }
          
          return {
            ...review,
            user: {
              id: review.user_id || profile?.user_id || '',
              name: displayName || 'User', // Fallback to 'User' if no name found
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
        
        // Debug logging
        if (!displayName) {
          console.warn('Review missing user name (refetch):', {
            review_id: review.id,
            user_id: review.user_id,
            profile: profile
          });
        }
        
        return {
          ...review,
          user: {
            id: review.user_id || profile?.user_id || '',
            name: displayName || 'User', // Fallback to 'User' if no name found
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
    refetch
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
        // Get recent reviews (sorted by date)
        const data = [...DUMMY_REVIEWS]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit || 10);

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
      const data = [...DUMMY_REVIEWS]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit || 10);
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

  const submitReview = async (reviewData: ReviewFormData): Promise<boolean> => {
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

    // Check email verification if we have a user
    if (currentUser && !currentUser.email_verified) {
      if (!checkEmailVerification('submit reviews')) {
        setError('You must verify your email to submit reviews');
        return false;
      }
    } else if (!currentUser) {
      // Only show error if we truly don't have a user
      // The API will also check, but we check here for better UX
      setError('You must be logged in to submit a review');
      showToast('Log in to submit a review', 'sage');
      return false;
    }

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
      reviewData.images?.forEach(image => {
        formData.append('images', image, image.name);
      });

      const response = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = 'Failed to submit review';
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.error || errorResult.details || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      showToast('Review submitted', 'sage', 3000);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
      setError(errorMessage);
      showToast(errorMessage, 'sage');
      console.error('Error submitting review:', err);
      return false;
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