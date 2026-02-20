/**
 * Hook to fetch the current user's stats from the API.
 * Uses SWR for caching and deduplication.
 */

import { useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { swrConfig } from '../lib/swrConfig';
import type { UserStats } from '../lib/types/user';

async function fetchUserStats([,]: [string, string]): Promise<UserStats | null> {
  const response = await fetch('/api/user/stats', { credentials: 'include' });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || errorData?.error || `Failed to fetch stats: ${response.status}`
    );
  }

  const result = await response.json();
  return result.data ?? null;
}

export function useUserStats() {
  const { user, isLoading: authLoading } = useAuth();

  const swrKey = (!authLoading && user?.id)
    ? (['/api/user/stats', user.id] as [string, string])
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchUserStats, swrConfig);

  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  return {
    stats: data ?? null,
    loading: authLoading || isLoading,
    error: error ? (error as Error).message : null,
    mutate,
  };
}
