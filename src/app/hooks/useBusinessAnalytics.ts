/**
 * Hook to fetch analytics data for a business from /api/businesses/${id}/analytics.
 */

'use client';

import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';

export type AnalyticsData = {
  viewsOverTime: { date: string; views: number }[];
  reviewsOverTime: { date: string; count: number }[];
  ratingTrend: { date: string; avgRating: number | null }[];
  totalHelpfulVotes: number;
  eventsCount: number;
  specialsCount: number;
  totalViews: number;
  totalReviews: number;
};

async function fetchBusinessAnalytics([, businessId, days]: [string, string, number]): Promise<AnalyticsData> {
  const res = await fetch(`/api/businesses/${businessId}/analytics?days=${days}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to load analytics');
  }
  return res.json();
}

export function useBusinessAnalytics(businessId: string | null | undefined, days = 30) {
  const swrKey = businessId
    ? (['/api/businesses/analytics', businessId, days] as [string, string, number])
    : null;

  const { data, error, isLoading } = useSWR(swrKey, fetchBusinessAnalytics, {
    ...swrConfig,
    dedupingInterval: 60_000 * 5, // 5-minute cache for analytics
    revalidateOnFocus: false,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}
