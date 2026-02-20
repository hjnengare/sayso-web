/**
 * Hook to fetch saved business details for the current user.
 * Only fetches when the user has saved items.
 * Uses SWR for caching and deduplication.
 */

import { useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { useSavedItems } from '../contexts/SavedItemsContext';
import { swrConfig } from '../lib/swrConfig';

async function fetchSavedBusinesses([,,]: [string, string, string]): Promise<any[]> {
  const response = await fetch('/api/saved/businesses?limit=20&page=1', { credentials: 'include' });

  if (response.status === 401) {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data.businesses) ? data.businesses : [];
}

export function useSavedBusinessesDetails() {
  const { user, isLoading: authLoading } = useAuth();
  const { savedItems } = useSavedItems();

  const swrKey = (!authLoading && user?.id && savedItems.length > 0)
    ? (['/api/saved/businesses', user.id, 'limit20'] as [string, string, string])
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchSavedBusinesses, swrConfig);

  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  return {
    businesses: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    mutate,
  };
}
