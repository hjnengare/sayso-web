/**
 * Hook to fetch and maintain the reviewer leaderboard.
 * Uses SWR for caching, with Supabase Realtime for live updates (10s throttle).
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { getBrowserSupabase } from '../lib/supabase/client';

export interface LeaderboardUser {
  rank: number;
  username: string;
  reviews: number;
  badge?: string;
  avatar: string;
  totalRating: number;
  id?: string;
}

const LEADERBOARD_URL = '/api/leaderboard?limit=50&sortBy=reviews';
const THROTTLE_MS = 10_000;

async function fetchLeaderboard(): Promise<LeaderboardUser[]> {
  const res = await fetch(LEADERBOARD_URL);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const data = await res.json();
  return data.leaderboard ?? [];
}

export function useLeaderboard(enabled = true) {
  const swrKey = enabled ? LEADERBOARD_URL : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchLeaderboard, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const lastRefetchRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const supabase = getBrowserSupabase();

    const throttledRefetch = () => {
      const now = Date.now();
      if (now - lastRefetchRef.current < THROTTLE_MS) return;
      lastRefetchRef.current = now;
      mutate();
    };

    const reviewsChannel = supabase
      .channel('leaderboard-reviews')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, throttledRefetch)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsRealtimeConnected(true);
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setIsRealtimeConnected(false);
      });

    const badgesChannel = supabase
      .channel('leaderboard-badges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_badges' }, throttledRefetch)
      .subscribe();

    return () => {
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(badgesChannel);
      setIsRealtimeConnected(false);
    };
  }, [enabled, mutate]);

  return {
    topReviewers: data ?? [],
    isLoadingLeaderboard: isLoading,
    leaderboardError: error ? (error as Error).message : null,
    isRealtimeConnected,
    refetch: () => mutate(),
  };
}
