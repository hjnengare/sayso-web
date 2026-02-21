/**
 * Hook to fetch the businesses owned by the current user.
 * Wraps BusinessOwnershipService.getBusinessesForOwner with SWR.
 */

'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { BusinessOwnershipService } from '../lib/services/businessOwnershipService';
import { businessUpdateEvents } from '../lib/utils/businessUpdateEvents';
import type { Business } from '../lib/types/database';

async function fetchOwnerBusinesses([, userId]: [string, string]): Promise<Business[]> {
  return BusinessOwnershipService.getBusinessesForOwner(userId);
}

export function useOwnerBusinessesList(userId: string | null | undefined) {
  const swrKey = userId ? (['/api/owner-businesses', userId] as [string, string]) : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchOwnerBusinesses, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  // Invalidate cache when a business is deleted or updated
  useEffect(() => {
    if (!userId) return;
    const unsubDelete = businessUpdateEvents.onDelete(() => mutate());
    const unsubUpdate = businessUpdateEvents.onUpdate(() => mutate());
    return () => {
      unsubDelete();
      unsubUpdate();
    };
  }, [userId, mutate]);

  return {
    businesses: data ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => mutate(),
    mutate,
  };
}
