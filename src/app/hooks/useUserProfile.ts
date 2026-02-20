/**
 * Hook to fetch the current user's enhanced profile from the API.
 * Uses SWR for caching and deduplication.
 */

import { useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { swrConfig } from '../lib/swrConfig';
import type { EnhancedProfile } from '../lib/types/user';

async function fetchUserProfile([,]: [string, string]): Promise<EnhancedProfile | null> {
  const response = await fetch('/api/user/profile', { credentials: 'include' });

  if (response.status === 401 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || errorData?.error || `Failed to fetch profile: ${response.status}`
    );
  }

  const result = await response.json();
  return result.data ?? null;
}

export function useUserProfile() {
  const { user, isLoading: authLoading } = useAuth();

  const swrKey = (!authLoading && user?.id)
    ? (['/api/user/profile', user.id] as [string, string])
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchUserProfile, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  return {
    profile: data ?? null,
    loading: authLoading || isLoading,
    error: error ? (error as Error).message : null,
    mutate,
  };
}
