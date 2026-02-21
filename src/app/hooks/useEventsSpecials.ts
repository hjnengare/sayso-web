/**
 * Hook to fetch events and specials with filter, search, and pagination.
 * Uses SWR for per-page caching and deduplication.
 * Pre-fetches the next page after each load for instant "Load More".
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import type { Event } from '../lib/types/Event';

const ITEMS_PER_PAGE = 20;
const REQUEST_TIMEOUT_MS = 12_000;

interface EventsPage {
  items: Event[];
  count: number;
}

function buildUrl(filter: string, search: string, offset: number): string {
  const url = new URL('/api/events-and-specials', typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  url.searchParams.set('limit', String(ITEMS_PER_PAGE));
  url.searchParams.set('offset', String(offset));
  if (filter !== 'all') url.searchParams.set('type', filter);
  if (search.trim()) url.searchParams.set('search', search.trim());
  return url.toString();
}

async function fetchEventsPage([, filter, search, offset]: [string, string, string, number]): Promise<EventsPage> {
  const url = buildUrl(filter, search, offset);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const data = await response.json();
    return {
      items: Array.isArray(data?.items) ? (data.items as Event[]) : [],
      count: Number(data?.count || 0),
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function useEventsSpecials(filter: string, search: string) {
  const [items, setItems] = useState<Event[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const resetRef = useRef(0);

  // SWR key for the current page
  const swrKey = ['/api/events', filter, search, offset] as [string, string, string, number];

  const { data, error, isLoading } = useSWR(swrKey, fetchEventsPage, {
    ...swrConfig,
    dedupingInterval: 30_000,
    revalidateOnMount: true,
  });

  // When filter or search changes, reset to page 0
  useEffect(() => {
    const id = ++resetRef.current;
    setOffset(0);
    setItems([]);
    setCount(0);
    setHasMore(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  // Sync SWR data into accumulated items
  useEffect(() => {
    if (!data) return;
    if (offset === 0) {
      // Replace items for fresh load
      setItems(data.items);
    }
    // For append loads, items are set in fetchMore
    setCount(data.count);
    setHasMore(offset + ITEMS_PER_PAGE < data.count);

    // Pre-fetch next page into SWR cache
    const nextOffset = offset + ITEMS_PER_PAGE;
    if (nextOffset < data.count) {
      const nextKey: [string, string, string, number] = ['/api/events', filter, search, nextOffset];
      globalMutate(nextKey, fetchEventsPage(nextKey), { revalidate: false });
    }
  }, [data, offset, filter, search]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextOffset = offset + ITEMS_PER_PAGE;
    setLoadingMore(true);

    try {
      const nextKey: [string, string, string, number] = ['/api/events', filter, search, nextOffset];
      const pageData = await fetchEventsPage(nextKey);
      if (pageData?.items?.length) {
        setItems(prev => [...prev, ...pageData.items]);
      }
      setCount(pageData.count);
      setOffset(nextOffset);
      setHasMore(nextOffset + ITEMS_PER_PAGE < pageData.count);
    } catch (e) {
      // Silent fail — user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, offset, filter, search]);

  return {
    items,
    count,
    hasMore,
    loading: isLoading && offset === 0 && items.length === 0,
    loadingMore,
    error: error ? (error as Error).message : null,
    fetchMore,
  };
}
