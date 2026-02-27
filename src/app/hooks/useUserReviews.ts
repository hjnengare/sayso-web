/**
 * Hook to fetch the current user's reviews from the API.
 * Uses SWR for caching and deduplication.
 */

import { useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { swrConfig } from '../lib/swrConfig';

export interface Review {
  id: string;
  business_id: string | null;
  business_name: string;
  rating: number;
  review_text: string | null;
  is_featured: boolean;
  created_at: string;
  business_image_url?: string | null;
  business_slug?: string;
}

async function fetchUserReviews([,]: [string, string]): Promise<Review[]> {
  const response = await fetch('/api/user/reviews?page=1&pageSize=20', { credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Failed to fetch user reviews: ${response.status}`);
  }

  const result = await response.json();

  if (result.data?.data && Array.isArray(result.data.data)) {
    return result.data.data.map((r: any) => ({
      id: r.id,
      business_id: r.business?.id || null,
      business_name: r.business?.name || 'Unknown Business',
      rating: r.rating,
      review_text: r.body || r.title || null,
      is_featured: false,
      created_at: r.created_at,
      business_image_url: r.business?.image_url || null,
      business_slug: r.business?.slug || r.business?.id,
    }));
  }

  return [];
}

export function useUserReviews() {
  const { user, isLoading: authLoading } = useAuth();

  const swrKey = (!authLoading && user?.id)
    ? (['/api/user/reviews', user.id] as [string, string])
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchUserReviews, swrConfig);

  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  return {
    reviews: data ?? [],
    loading: authLoading || isLoading,
    error: error ? (error as Error).message : null,
    mutate,
  };
}
