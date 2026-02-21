/**
 * Hook to fetch the target (event or special) for the write-review page.
 * Fetches /api/events/${id} or /api/specials/${id} based on type.
 */

'use client';

import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';

type ReviewTargetType = 'event' | 'special';

async function fetchReviewTarget([, type, id]: [string, ReviewTargetType, string]): Promise<object> {
  const endpoint = type === 'event' ? `/api/events/${id}` : `/api/specials/${id}`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error('Target not found');
  }
  const data = await res.json();
  const extracted = type === 'event' ? data.event : data.special;
  if (!extracted) throw new Error('Target not found');
  return extracted;
}

export function useReviewTarget(type: string | null | undefined, id: string | null | undefined) {
  const validType = type === 'event' || type === 'special' ? type : null;
  const swrKey =
    validType && id
      ? (['/api/review-target', validType, id] as [string, ReviewTargetType, string])
      : null;

  const { data, error, isLoading } = useSWR(swrKey, fetchReviewTarget, {
    ...swrConfig,
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  });

  return {
    target: data ?? null,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    isInvalidType: !!type && !validType,
  };
}
