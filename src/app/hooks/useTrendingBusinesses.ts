/**
 * Hook to fetch globally-trending businesses from the dedicated trending API.
 *
 * This is intentionally separate from useBusinesses / useForYouBusinesses:
 *   - Trending = global discovery (same results for everyone)
 *   - For You  = personalized (mixed feed with preferences & dealbreakers)
 *
 * Backed by the `mv_trending_businesses` materialized view which refreshes
 * every 15 minutes via pg_cron.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Business } from '../components/BusinessCard/BusinessCard';

export interface UseTrendingOptions {
  limit?: number;
  category?: string;
  skip?: boolean;
}

export interface UseTrendingResult {
  businesses: Business[];
  loading: boolean;
  error: string | null;
  count: number;
  refetch: () => void;
  refreshedAt: string | null;
}

export function useTrendingBusinesses(
  options: UseTrendingOptions = {},
): UseTrendingResult {
  const { limit = 20, category, skip = false } = options;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTrending = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const timeoutId = setTimeout(() => abortController.abort(), 10_000);

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (category) params.set('category', category);

      const response = await fetch(`/api/trending?${params.toString()}`, {
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const message = `Failed to fetch trending: ${response.statusText}`;
        if (abortControllerRef.current === abortController) {
          setError(message);
        }
        return;
      }

      const data = await response.json();

      if (abortControllerRef.current === abortController) {
        setBusinesses(data.businesses || []);
        setCount(data.meta?.count || 0);
        setRefreshedAt(data.meta?.refreshedAt || null);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        if (abortControllerRef.current !== abortController) {
          return; // Superseded by a newer request
        }
        console.warn('[useTrendingBusinesses] Request timed out');
        setLoading(false);
        return;
      }
      if (abortControllerRef.current === abortController) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trending');
        console.error('[useTrendingBusinesses] Error:', err);
      }
    } finally {
      clearTimeout(timeoutId);
      if (abortControllerRef.current === abortController) {
        setLoading(false);
      }
    }
  }, [limit, category, skip]);

  useEffect(() => {
    fetchTrending();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTrending]);

  return {
    businesses,
    loading,
    error,
    count,
    refetch: fetchTrending,
    refreshedAt,
  };
}
