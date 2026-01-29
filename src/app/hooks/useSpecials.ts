import { useState, useEffect, useCallback, useRef } from 'react';
import type { Event } from '../lib/types/Event';

export interface UseSpecialsOptions {
  limit?: number;
  offset?: number;
  search?: string;
  businessId?: string;
}

export interface UseSpecialsResult {
  specials: Event[];
  loading: boolean;
  error: string | null;
  count: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch business specials from the /api/specials endpoint
 */
export function useSpecials(options: UseSpecialsOptions = {}): UseSpecialsResult {
  const { limit = 20, offset = 0, search, businessId } = options;
  const [specials, setSpecials] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(offset);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSpecials = useCallback(async (appendMode = false) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      if (!appendMode) {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', appendMode ? currentOffset.toString() : '0');
      if (search) params.set('search', search);
      if (businessId) params.set('businessId', businessId);

      const response = await fetch(`/api/specials?${params.toString()}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        const message = `Failed to fetch specials: ${response.statusText}`;
        if (!abortController.signal.aborted) {
          setError(message);
          console.error('[useSpecials] Error:', message);
        }
        return;
      }

      const data = await response.json();

      if (abortController.signal.aborted) return;

      // Transform to Event type (API already transforms, but ensure all fields)
      const transformedSpecials: Event[] = (data.specials || []).map((special: any) => ({
        ...special,
        type: 'special' as const,
      }));

      if (appendMode) {
        setSpecials(prev => [...prev, ...transformedSpecials]);
        setCurrentOffset(prev => prev + limit);
      } else {
        setSpecials(transformedSpecials);
        setCurrentOffset(limit);
      }
      setCount(data.count || 0);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch specials';
      if (!abortController.signal.aborted) {
        setError(errorMessage);
        console.error('[useSpecials] Error:', err);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [limit, search, businessId, currentOffset]);

  const loadMore = useCallback(async () => {
    if (loading) return;
    await fetchSpecials(true);
  }, [loading, fetchSpecials]);

  const refetch = useCallback(async () => {
    setCurrentOffset(0);
    await fetchSpecials(false);
  }, [fetchSpecials]);

  useEffect(() => {
    fetchSpecials(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [search, businessId]); // Re-fetch when search or businessId changes

  const hasMore = specials.length < count;

  return {
    specials,
    loading,
    error,
    count,
    hasMore,
    loadMore,
    refetch,
  };
}
