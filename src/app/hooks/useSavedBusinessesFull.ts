/**
 * Hook to fetch the full list of saved businesses for the current user.
 * Uses SWR for caching. Invalidated when SavedItemsContext changes.
 */

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { swrConfig } from '../lib/swrConfig';
import type { Business } from '../components/BusinessCard/BusinessCard';

interface SavedBusinessesData {
  businesses: Business[];
  error: string | null;
}

async function fetchSavedBusinessesFull([, userId]: [string, string]): Promise<SavedBusinessesData> {
  const response = await fetch('/api/user/saved', { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 401) {
      return { businesses: [], error: null };
    }

    let errorMessage = 'Failed to fetch saved businesses';
    let errorCode: string | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorCode = errorData.code;
    } catch {
      // ignore parse error
    }

    const isTableError =
      response.status === 500 &&
      (errorCode === '42P01' ||
        errorCode === '42501' ||
        errorMessage.toLowerCase().includes('relation') ||
        errorMessage.toLowerCase().includes('does not exist') ||
        errorMessage.toLowerCase().includes('permission denied'));

    if (isTableError) {
      return { businesses: [], error: null };
    }

    const userMessage =
      response.status >= 500
        ? 'Unable to load saved items at the moment. Please try again later.'
        : null;

    return { businesses: [], error: userMessage };
  }

  const data = await response.json();
  const businesses: Business[] = (data.businesses ?? []).filter(
    (b: Business) => b?.id && b?.name?.trim()
  );

  return { businesses, error: null };
}

export function useSavedBusinesses() {
  const { user, isLoading: authLoading } = useAuth();

  const swrKey = (!authLoading && user?.id)
    ? (['/api/user/saved', user.id] as [string, string])
    : null;

  const { data, error: swrError, isLoading, mutate } = useSWR(swrKey, fetchSavedBusinessesFull, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  return {
    businesses: data?.businesses ?? [],
    loading: authLoading || isLoading,
    error: data?.error ?? (swrError ? (swrError as Error).message : null),
    refetch: () => mutate(),
    mutate,
  };
}

/**
 * Globally invalidate the saved businesses list for a user.
 */
export function invalidateSavedBusinessesFull(userId: string) {
  globalMutate(['/api/user/saved', userId]);
}
