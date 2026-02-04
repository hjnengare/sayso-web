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
  /** HTTP status when error is set (e.g. 500). Helps UI show status so count 0 doesn't hide the problem. */
  statusCode: number | null;
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
  const [statusCode, setStatusCode] = useState<number | null>(null);
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
    const timeoutId = setTimeout(() => abortController.abort(), 18_000);

    try {
      setLoading(true);
      setError(null);
      setStatusCode(null);

      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (category) params.set('category', category);

      const response = await fetch(`/api/trending?${params.toString()}`, {
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let message = response.statusText;
        try {
          const body = await response.json();
          message = body?.error || body?.details || message;
        } catch {
          // keep message as statusText
        }
        if (abortControllerRef.current === abortController) {
          setStatusCode(response.status);
          setError(`${response.status}: ${message}`);
        }
        return;
      }

      const data = await response.json();

      if (abortControllerRef.current === abortController) {
        setBusinesses(data.businesses || []);
        setCount(data.meta?.count ?? (data.businesses?.length ?? 0));
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
        setStatusCode(null);
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
    statusCode,
    count,
    refetch: fetchTrending,
    refreshedAt,
  };
}
