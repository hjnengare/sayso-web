/**
 * Hook for the owner business dashboard page.
 * Fetches the owned business (with access check), stats, and 30-day analytics counts.
 */

'use client';

import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { BusinessOwnershipService } from '../lib/services/businessOwnershipService';
import { getBrowserSupabase } from '../lib/supabase/client';
import type { Business } from '../lib/types/database';

interface BusinessStats {
  average_rating: number | null;
  total_reviews: number;
}

interface DashboardAnalytics {
  profileViews: number;
  newReviews: number;
}

interface DashboardData {
  business: Business;
  stats: BusinessStats;
  analytics: DashboardAnalytics;
}

async function fetchDashboard([, userId, businessId]: [string, string, string]): Promise<DashboardData> {
  const businessData = await BusinessOwnershipService.getOwnedBusinessById(userId, businessId);

  if (!businessData) {
    const err: any = new Error('You do not have access to this business or it does not exist');
    err.status = 403;
    throw err;
  }

  const resolvedId = businessData.id;
  const supabase = getBrowserSupabase();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [statsResult, reviewsResult, viewsResult] = await Promise.allSettled([
    supabase
      .from('business_stats')
      .select('average_rating, total_reviews')
      .eq('business_id', resolvedId)
      .single(),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', resolvedId)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    fetch(`/api/businesses/${resolvedId}/views?days=30`).then(r => r.json()),
  ]);

  const stats: BusinessStats =
    statsResult.status === 'fulfilled' && !statsResult.value.error && statsResult.value.data
      ? {
          average_rating: statsResult.value.data.average_rating,
          total_reviews: statsResult.value.data.total_reviews || 0,
        }
      : { average_rating: null, total_reviews: 0 };

  const analytics: DashboardAnalytics = {
    newReviews: reviewsResult.status === 'fulfilled' ? (reviewsResult.value.count ?? 0) : 0,
    profileViews: viewsResult.status === 'fulfilled' ? (viewsResult.value.count ?? 0) : 0,
  };

  return { business: businessData, stats, analytics };
}

export function useOwnerBusinessDashboard(
  userId: string | null | undefined,
  businessId: string | null | undefined,
) {
  const enabled = !!userId && !!businessId;
  const swrKey = enabled
    ? (['/api/owner-business-dashboard', userId, businessId] as [string, string, string])
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchDashboard, {
    ...swrConfig,
    dedupingInterval: 30_000,
    revalidateOnFocus: true, // refresh when returning from edit page
  });

  const err = error as (Error & { status?: number }) | undefined;

  return {
    business: data?.business ?? null,
    stats: data?.stats ?? null,
    analytics: data?.analytics ?? null,
    hasAccess: !!data?.business,
    isLoading,
    error: err ? err.message : null,
    errorStatus: err?.status ?? null,
    refetch: () => mutate(),
    mutate,
    // Update business in cache (e.g. after profile picture upload)
    setBusiness: (updater: (prev: Business | null) => Business | null) => {
      mutate(prev => {
        if (!prev) return prev;
        const updated = updater(prev.business);
        return updated ? { ...prev, business: updated } : prev;
      }, { revalidate: false });
    },
    // Update stats in cache (e.g. from realtime)
    setStats: (updater: (prev: BusinessStats | null) => BusinessStats | null) => {
      mutate(prev => {
        if (!prev) return prev;
        const updated = updater(prev.stats);
        return updated ? { ...prev, stats: updated } : prev;
      }, { revalidate: false });
    },
    // Update analytics in cache (e.g. from realtime reviews)
    setAnalytics: (updater: (prev: DashboardAnalytics | null) => DashboardAnalytics | null) => {
      mutate(prev => {
        if (!prev) return prev;
        const updated = updater(prev.analytics);
        return updated ? { ...prev, analytics: updated } : prev;
      }, { revalidate: false });
    },
  };
}
