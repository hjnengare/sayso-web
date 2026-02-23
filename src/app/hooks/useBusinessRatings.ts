/**
 * SWR hook for business ratings (avg + count) with realtime invalidation.
 */
'use client';

import { useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { getBrowserSupabase } from '../lib/supabase/client';

type BusinessRatingResponse = {
  rating: number;
  total_reviews: number;
};

async function fetchBusinessRatings([, businessId]: [string, string]): Promise<BusinessRatingResponse> {
  const res = await fetch(`/api/businesses/${businessId}/ratings`);
  if (!res.ok) return { rating: 0, total_reviews: 0 };
  const data = await res.json();
  return {
    rating: Number(data?.rating) || 0,
    total_reviews: Number(data?.total_reviews) || 0,
  };
}

export function useBusinessRatings(
  businessId: string | null | undefined,
  fallbackRating = 0,
  fallbackTotalReviews = 0,
) {
  const swrKey = businessId ? (['/api/businesses/ratings', businessId] as [string, string]) : null;

  const { data, error, isLoading, mutate } = useSWR<BusinessRatingResponse>(
    swrKey,
    fetchBusinessRatings,
    {
      ...swrConfig,
      dedupingInterval: 30_000,
      fallbackData: { rating: fallbackRating, total_reviews: fallbackTotalReviews },
    }
  );

  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  // Realtime: listen to reviews table for this business and mutate ratings
  useEffect(() => {
    if (!businessId) return;
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`business-ratings-${businessId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        mutate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, mutate]);

  return {
    rating: data?.rating ?? fallbackRating,
    totalReviews: data?.total_reviews ?? fallbackTotalReviews,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    mutate,
  };
}

export function invalidateBusinessRatings(businessId: string) {
  globalMutate(['/api/businesses/ratings', businessId]);
}
