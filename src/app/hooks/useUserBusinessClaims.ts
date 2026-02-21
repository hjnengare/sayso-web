/**
 * Hook to fetch the current user's business claims from /api/business/claims.
 * Uses SWR for caching and deduplication.
 */

'use client';

import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';

export interface BusinessClaim {
  id: string;
  business_id: string;
  business_name: string;
  business_slug: string | null;
  status: string;
  display_status: string;
  next_step: string;
  rejection_reason: string | null;
  location?: string;
}

async function fetchClaims(): Promise<BusinessClaim[]> {
  const res = await fetch('/api/business/claims', {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (typeof payload?.error === 'string' && payload.error) ||
      (typeof payload?.message === 'string' && payload.message) ||
      'Unable to load your claims right now.';
    throw new Error(message);
  }

  if (!Array.isArray(payload?.claims)) {
    throw new Error('Unexpected claims response. Please refresh and try again.');
  }

  return payload.claims as BusinessClaim[];
}

export function useUserBusinessClaims(userId: string | null | undefined) {
  const swrKey = userId ? '/api/business/claims' : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchClaims, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  return {
    claims: data ?? [],
    claimsLoading: isLoading,
    claimsError: error ? (error as Error).message : null,
    refetchClaims: () => mutate(),
  };
}
