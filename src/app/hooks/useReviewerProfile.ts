/**
 * Hook to fetch a public reviewer profile by user ID.
 * Uses SWR for caching, deduplication, and realtime invalidation.
 */

'use client';

import { useEffect, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { getBrowserSupabase } from '../lib/supabase/client';

async function fetchReviewerProfile([, reviewerId]: [string, string]): Promise<any> {
  const response = await fetch(`/api/reviewers/${reviewerId}`);

  if (!response.ok) {
    const err: any = new Error(`Failed to fetch reviewer: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  return data.reviewer ?? null;
}

export function useReviewerProfile(reviewerId: string | null | undefined) {
  const swrKey = reviewerId ? (['/api/reviewers', reviewerId] as [string, string]) : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchReviewerProfile, {
    ...swrConfig,
    dedupingInterval: 60_000,
  });

  // Visibility-based refetch
  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  // Realtime: throttled refetch on reviews/badges changes
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    if (!reviewerId) return;

    const supabase = getBrowserSupabase();
    const THROTTLE_MS = 5_000;
    let lastRefresh = 0;
    let subscribedCount = 0;

    const throttledRefresh = () => {
      const now = Date.now();
      if (now - lastRefresh < THROTTLE_MS) return;
      lastRefresh = now;
      mutate();
    };

    const handleStatus = (status: string) => {
      if (status === 'SUBSCRIBED') {
        subscribedCount++;
        if (subscribedCount >= 2) setIsRealtimeConnected(true);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        subscribedCount = Math.max(0, subscribedCount - 1);
        setIsRealtimeConnected(false);
      }
    };

    const reviewsChannel = supabase
      .channel(`reviewer-reviews-swr-${reviewerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews',
        filter: `user_id=eq.${reviewerId}`,
      }, throttledRefresh)
      .subscribe(handleStatus);

    const badgesChannel = supabase
      .channel(`reviewer-badges-swr-${reviewerId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_badges',
        filter: `user_id=eq.${reviewerId}`,
      }, throttledRefresh)
      .subscribe(handleStatus);

    return () => {
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(badgesChannel);
      setIsRealtimeConnected(false);
    };
  }, [reviewerId, mutate]);

  const err = error as (Error & { status?: number }) | undefined;

  return {
    reviewer: data ?? null,
    loading: isLoading,
    error: err ? err.message : null,
    isRealtimeConnected,
    refetch: () => mutate(),
    mutate,
  };
}

/**
 * Globally invalidate a reviewer's cached profile.
 */
export function invalidateReviewerProfile(reviewerId: string) {
  globalMutate(['/api/reviewers', reviewerId]);
}
