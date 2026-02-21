/**
 * Hook to fetch and toggle the "helpful" status/count for a review.
 * Uses SWR with optimistic toggle.
 */

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { useAuth } from '../contexts/AuthContext';
import { isOptimisticId, isValidUUID } from '../lib/utils/validation';

interface HelpfulData {
  count: number;
  isHelpful: boolean;
}

async function fetchHelpfulData([, reviewId, userId]: [string, string, string | null]): Promise<HelpfulData> {
  const [countRes, statusRes] = await Promise.all([
    fetch(`/api/reviews/${reviewId}/helpful/count`),
    userId ? fetch(`/api/reviews/${reviewId}/helpful`) : Promise.resolve(null),
  ]);

  let count = 0;
  let isHelpful = false;

  if (countRes.ok) {
    const data = await countRes.json();
    if (typeof data.count === 'number') count = data.count;
  }

  if (statusRes?.ok) {
    const data = await statusRes.json();
    if (typeof data.helpful === 'boolean') isHelpful = data.helpful;
  }

  return { count, isHelpful };
}

export function useReviewHelpful(reviewId: string, initialCount = 0) {
  const { user } = useAuth();

  const isSkipped = !reviewId || isOptimisticId(reviewId) || !isValidUUID(reviewId);
  const swrKey = isSkipped
    ? null
    : (['/api/reviews/helpful', reviewId, user?.id ?? null] as [string, string, string | null]);

  const { data, isLoading, mutate } = useSWR(swrKey, fetchHelpfulData, {
    ...swrConfig,
    dedupingInterval: 30_000,
    fallbackData: { count: initialCount, isHelpful: false },
  });

  const toggle = async () => {
    if (!user || !swrKey || isLoading) return;

    const prev = data ?? { count: initialCount, isHelpful: false };
    const next: HelpfulData = prev.isHelpful
      ? { count: Math.max(0, prev.count - 1), isHelpful: false }
      : { count: prev.count + 1, isHelpful: true };

    // Optimistic update
    mutate(next, { revalidate: false });

    try {
      const method = prev.isHelpful ? 'DELETE' : 'POST';
      const res = await fetch(`/api/reviews/${reviewId}/helpful`, { method });

      if (!res.ok) {
        mutate(prev, { revalidate: false });
        return;
      }

      // Sync server count
      const countRes = await fetch(`/api/reviews/${reviewId}/helpful/count`);
      if (countRes.ok) {
        const countData = await countRes.json();
        if (typeof countData.count === 'number') {
          mutate({ ...next, count: countData.count }, { revalidate: false });
        }
      }

      // Invalidate top reviewers list (helpfulVotes changed for review author)
      globalMutate(
        (key: any) => Array.isArray(key) && key[0] === '/api/reviewers/top',
        undefined,
        { revalidate: true }
      );
    } catch {
      mutate(prev, { revalidate: false });
    }
  };

  return {
    count: data?.count ?? initialCount,
    isHelpful: data?.isHelpful ?? false,
    loading: isLoading,
    toggle,
    mutate,
  };
}

export function invalidateReviewHelpful(reviewId: string) {
  globalMutate((key: any) => Array.isArray(key) && key[0] === '/api/reviews/helpful' && key[1] === reviewId);
}
