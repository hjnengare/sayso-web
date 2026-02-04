import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Event } from '../lib/types/Event';

export interface UseEventsOptions {
  limit?: number;
  offset?: number;
  city?: string;
  segment?: string;
  search?: string;
  upcoming?: boolean;
}

export interface UseEventsResult {
  events: Event[];
  loading: boolean;
  error: string | null;
  count: number;
  refetch: () => Promise<void>;
}

export interface UseEventsAccumulatorOptions {
  pageSize?: number;
  city?: string;
  segment?: string;
  search?: string;
  upcoming?: boolean;
}

export interface UseEventsAccumulatorResult {
  /** Consolidated events (deduplicated with date ranges) */
  events: Event[];
  /** Raw events before consolidation (for debugging) */
  rawEventCount: number;
  /** Whether initial load is in progress */
  loading: boolean;
  /** Whether loading more pages */
  loadingMore: boolean;
  /** Error message if any */
  error: string | null;
  /** Total count from server (before consolidation) */
  totalCount: number;
  /** Number of consolidated events */
  consolidatedCount: number;
  /** Whether there are more pages to load */
  hasMore: boolean;
  /** Load more events (next page) */
  loadMore: () => Promise<void>;
  /** Reset and refetch from the beginning */
  reset: () => Promise<void>;
  /** Current page number */
  currentPage: number;
}

// ============================================================================
// SHARED UTILITIES (used by both hooks)
// ============================================================================

// Optimized date formatter (cached)
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

// Optimized icon mapper
export const getIcon = (segment: string | null, genre: string | null): string => {
  const segmentLower = (segment || '').toLowerCase();
  const genreLower = (genre || '').toLowerCase();
  
  if (segmentLower.includes('music') || genreLower.includes('music')) {
    return 'musical-notes-outline';
  }
  if (segmentLower.includes('sport')) {
    return 'basketball-outline';
  }
  if (segmentLower.includes('art') || segmentLower.includes('theatre')) {
    return 'brush-outline';
  }
  if (segmentLower.includes('comedy')) {
    return 'happy-outline';
  }
  return 'calendar-outline';
};

// Optimized date formatter
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    return dateFormatter.format(new Date(dateString));
  } catch {
    return '';
  }
};

// Optimized price formatter
const formatPrice = (priceRange: any): string | null => {
  if (!priceRange || !Array.isArray(priceRange) || priceRange.length === 0) {
    return null;
  }
  const price = priceRange[0];
  if (price.min && price.max) {
    return `£${price.min} - £${price.max}`;
  }
  if (price.min) {
    return `From £${price.min}`;
  }
  return null;
};

const normalize = (value: string | undefined | null) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

/**
 * Extract attraction ID from Ticketmaster raw_data
 * The attraction represents the event series (e.g., "Pretty Woman The Musical")
 */
const extractAttractionId = (rawData: any): string | null => {
  if (!rawData) return null;
  // Ticketmaster API structure: _embedded.attractions[0].id
  const attractions = rawData._embedded?.attractions;
  if (attractions && Array.isArray(attractions) && attractions.length > 0) {
    return attractions[0].id || null;
  }
  return null;
};

/**
 * Extract venue ID from Ticketmaster raw_data
 */
const extractVenueId = (rawData: any): string | null => {
  if (!rawData) return null;
  // Ticketmaster API structure: _embedded.venues[0].id
  const venues = rawData._embedded?.venues;
  if (venues && Array.isArray(venues) && venues.length > 0) {
    return venues[0].id || null;
  }
  return null;
};

/**
 * Build a canonical key for event consolidation
 * Priority:
 * 1. Ticketmaster attraction ID + venue (most reliable for grouping same shows)
 * 2. Normalized title + venue name + city (fallback for all events)
 */
const buildCanonicalKey = (event: {
  title?: string;
  location?: string;
  venueName?: string;
  city?: string;
  ticketmasterAttractionId?: string | null;
  venueId?: string | null;
  source?: string;
}) => {
  // For Ticketmaster events with attraction ID, use that as the primary key
  // This groups all dates of the same show together
  if (event.ticketmasterAttractionId) {
    const venueKey = event.venueId || normalize(event.venueName) || normalize(event.location);
    return `attraction:${event.ticketmasterAttractionId}:${venueKey}`;
  }

  // Fallback: use normalized title + venue + city
  // This handles non-Ticketmaster events and TM events without attraction ID
  const titleKey = normalize(event.title);
  const venueKey = normalize(event.venueName) || normalize(event.location);
  const cityKey = normalize(event.city);

  return `event:${titleKey}:${venueKey}:${cityKey}`;
};

/**
 * Check if two events should be considered the same event series
 * Used as fallback when canonical keys don't match
 */
const isSameEventSeries = (a: Event, b: Event): boolean => {
  // Must have matching titles (case-insensitive, normalized)
  const titleMatch = normalize(a.title) === normalize(b.title);
  if (!titleMatch) return false;

  // Must have matching venue (by ID, name, or location)
  const venueMatch =
    (a.venueId && b.venueId && a.venueId === b.venueId) ||
    (normalize(a.venueName) && normalize(a.venueName) === normalize(b.venueName)) ||
    (normalize(a.location) === normalize(b.location));
  if (!venueMatch) return false;

  // Must have matching city (if both have city info)
  if (a.city && b.city && normalize(a.city) !== normalize(b.city)) {
    return false;
  }

  // All checks passed - these are the same event series
  return true;
};

/**
 * Aggregate events by consolidating duplicate event series into single entries
 * with date ranges. This transforms multiple rows for "Pretty Woman Mar 21",
 * "Pretty Woman Mar 22", etc. into a single "Pretty Woman Mar 21-28" entry.
 */
const aggregateEvents = (events: Event[]): Event[] => {
  const map = new Map<string, Event & {
    occurrences: Array<{ startDate: string; endDate?: string; bookingUrl?: string }>;
    startDateISO?: string;
    endDateISO?: string;
    allDates: string[];
  }>();

  for (const evt of events) {
    const primaryKey = evt.canonicalKey || buildCanonicalKey(evt);
    const startISO = evt.startDateISO || evt.startDate;
    const endISO = evt.endDateISO || evt.endDate;

    let keyToUse = primaryKey;

    // First check if canonical key matches an existing entry
    if (!map.has(primaryKey)) {
      // Try fallback matching against existing entries
      // This catches events that should be grouped but have different canonical keys
      const entries = Array.from(map.entries());
      for (let i = 0; i < entries.length; i++) {
        const [existingKey, existing] = entries[i];
        if (isSameEventSeries(existing, evt)) {
          keyToUse = existingKey;
          break;
        }
      }
    }

    const existing = map.get(keyToUse);
    if (!existing) {
      // First occurrence of this event series
      map.set(keyToUse, {
        ...evt,
        canonicalKey: keyToUse,
        startDateISO: startISO,
        endDateISO: endISO,
        occurrences: [{ startDate: startISO, endDate: endISO, bookingUrl: evt.bookingUrl || evt.purchaseUrl }],
        allDates: startISO ? [startISO] : [],
      });
      continue;
    }

    // Add this occurrence to the existing event series
    const occurrences = existing.occurrences ? [...existing.occurrences] : [];
    occurrences.push({ startDate: startISO, endDate: endISO, bookingUrl: evt.bookingUrl || evt.purchaseUrl });

    // Track all dates for this event series
    const allDates = existing.allDates ? [...existing.allDates] : [];
    if (startISO && !allDates.includes(startISO)) {
      allDates.push(startISO);
    }

    // Calculate the date range (earliest start to latest end)
    const allStarts = occurrences.map((o) => o.startDate).filter(Boolean);
    const allEnds = occurrences
      .map((o) => o.endDate || o.startDate)
      .filter(Boolean);

    // Sort to find min/max dates
    allStarts.sort();
    allEnds.sort();

    const minStart = allStarts[0] || existing.startDateISO;
    const maxEnd = allEnds[allEnds.length - 1] || existing.endDateISO;

    map.set(keyToUse, {
      ...existing,
      occurrences,
      allDates,
      startDateISO: minStart,
      endDateISO: maxEnd,
      startDate: minStart ? formatDate(minStart) : existing.startDate,
      endDate: maxEnd ? formatDate(maxEnd) : existing.endDate,
      // Keep the best available booking URL and href
      href: existing.href || evt.href,
      bookingUrl: existing.bookingUrl || evt.bookingUrl,
      purchaseUrl: existing.purchaseUrl || evt.purchaseUrl,
      // Keep the best image (prefer existing to avoid flicker)
      image: existing.image || evt.image,
    });
  }

  // Sort by earliest start date
  return Array.from(map.values()).sort((a, b) => {
    const aDate = a.startDateISO ? new Date(a.startDateISO).getTime() : new Date(a.startDate).getTime();
    const bDate = b.startDateISO ? new Date(b.startDateISO).getTime() : new Date(b.startDate).getTime();
    return aDate - bDate;
  });
};

/**
 * Hook to fetch events from the database
 * Optimized for performance with request timeout and efficient data transformation
 */
export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const { limit = 20, offset = 0, city, segment, search, upcoming = true } = options;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchEvents = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Use a single controller for both deduplication and timeout
    const timeoutId = setTimeout(() => abortController.abort(), 15_000);

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (limit) params.set('limit', limit.toString());
      if (offset) params.set('offset', offset.toString());
      if (city) params.set('city', city);
      if (segment) params.set('segment', segment);
      if (search) params.set('search', search);
      if (upcoming !== undefined) params.set('upcoming', upcoming.toString());

      const response = await fetch(`/api/events?${params.toString()}`, {
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const message = `Failed to fetch events: ${response.statusText}`;
        if (!abortController.signal.aborted) {
          // 404 usually means events API not available (e.g. route not registered); fail softly
          if (response.status === 404) {
            console.warn('[useEvents] Events API not found (404). Showing empty list.');
            setEvents([]);
            setCount(0);
            setError(null);
            setLoading(false);
            return;
          }
          setError(message);
          console.error('[useEvents] Error:', message);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Debug logging
      if (typeof window !== 'undefined') {
        console.log('[useEvents] API Response:', {
          eventsCount: data.events?.length || 0,
          count: data.count,
          hasEvents: !!(data.events && data.events.length > 0),
          sampleEvent: data.events?.[0]
        });
      }
      
      // Transform database events to Event type (optimized)
      const transformedEvents: Event[] = (data.events || []).map((dbEvent: any) => {
        const startISO = dbEvent.start_date || null;
        const endISO = dbEvent.end_date || null;
        const id = dbEvent.ticketmaster_id || dbEvent.id;
        const source = dbEvent.source || (dbEvent.ticketmaster_id ? 'ticketmaster' : 'internal');
        const city = dbEvent.city;
        const bookingUrl = dbEvent.ticket_url || dbEvent.booking_url || dbEvent.url || undefined;

        // Use pre-extracted attraction/venue IDs from the API response
        // (server extracts these from raw_data to keep payloads small)
        const attractionId = dbEvent.attraction_id ||
          dbEvent.ticketmaster_attraction_id ||
          null;
        const venueId = dbEvent.venue_id ||
          dbEvent.venueId ||
          null;

        const eventData = {
          id,
          title: dbEvent.title || 'Untitled Event',
          type: 'event' as const,
          image: dbEvent.image_url || null,
          alt: `${dbEvent.title} at ${dbEvent.venue_name || dbEvent.city || 'location'}`,
          icon: getIcon(dbEvent.segment, dbEvent.genre),
          location: dbEvent.venue_name || dbEvent.city || 'Location TBD',
          rating: 4.5,
          startDate: startISO ? formatDate(startISO) : '',
          endDate: endISO ? formatDate(endISO) : undefined,
          startDateISO: startISO || undefined,
          endDateISO: endISO || undefined,
          price: formatPrice(dbEvent.price_range),
          description: dbEvent.description || undefined,
          href: `/event/${id}`,
          source,
          ticketmasterAttractionId: attractionId,
          venueId: venueId,
          venueName: dbEvent.venue_name || undefined,
          city,
          purchaseUrl: bookingUrl,
          bookingUrl,
          occurrences: [{ startDate: startISO, endDate: endISO, bookingUrl }],
        };

        // Build canonical key for consolidation
        const canonicalKey = buildCanonicalKey({
          title: eventData.title,
          location: eventData.location,
          venueName: eventData.venueName,
          city: eventData.city,
          ticketmasterAttractionId: attractionId,
          venueId: venueId,
          source,
        });

        return {
          ...eventData,
          canonicalKey,
        };
      });

      if (!abortController.signal.aborted) {
        setEvents(aggregateEvents(transformedEvents));
        setCount(data.count || 0);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        // If a newer request replaced us, ignore silently
        if (abortControllerRef.current !== abortController) {
          return;
        }
        // Otherwise this was a timeout — log it but don't block rendering
        console.warn('[useEvents] Request timed out after 15s');
        setLoading(false);
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      if (abortControllerRef.current === abortController) {
        setError(errorMessage);
        console.error('[useEvents] Error:', err);
      }
    } finally {
      clearTimeout(timeoutId);
      if (abortControllerRef.current === abortController) {
        setLoading(false);
      }
    }
  }, [limit, offset, city, segment, search, upcoming]);

  useEffect(() => {
    fetchEvents();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    count,
    refetch: fetchEvents,
  };
}

// ============================================================================
// GLOBAL CONSOLIDATION HOOK
// Accumulates events across all pages and consolidates globally
// ============================================================================

/**
 * Transform a database event to the Event type
 * Exported for use in the accumulator hook
 */
const transformDbEvent = (dbEvent: any): Event => {
  const startISO = dbEvent.start_date || null;
  const endISO = dbEvent.end_date || null;
  const id = dbEvent.ticketmaster_id || dbEvent.id;
  const source = dbEvent.source || (dbEvent.ticketmaster_id ? 'ticketmaster' : 'internal');
  const city = dbEvent.city;
  const bookingUrl = dbEvent.ticket_url || dbEvent.booking_url || dbEvent.url || undefined;

  // Use pre-extracted attraction/venue IDs from the API response
  const attractionId = dbEvent.attraction_id ||
    dbEvent.ticketmaster_attraction_id ||
    null;
  const venueId = dbEvent.venue_id ||
    dbEvent.venueId ||
    null;

  const eventData = {
    id,
    title: dbEvent.title || 'Untitled Event',
    type: 'event' as const,
    image: dbEvent.image_url || null,
    alt: `${dbEvent.title} at ${dbEvent.venue_name || dbEvent.city || 'location'}`,
    icon: getIcon(dbEvent.segment, dbEvent.genre),
    location: dbEvent.venue_name || dbEvent.city || 'Location TBD',
    rating: 4.5,
    startDate: startISO ? formatDate(startISO) : '',
    endDate: endISO ? formatDate(endISO) : undefined,
    startDateISO: startISO || undefined,
    endDateISO: endISO || undefined,
    price: formatPrice(dbEvent.price_range),
    description: dbEvent.description || undefined,
    href: `/event/${id}`,
    source,
    ticketmasterAttractionId: attractionId,
    venueId: venueId,
    venueName: dbEvent.venue_name || undefined,
    city,
    purchaseUrl: bookingUrl,
    bookingUrl,
    occurrences: [{ startDate: startISO, endDate: endISO, bookingUrl }],
  };

  // Build canonical key for consolidation
  const canonicalKey = buildCanonicalKey({
    title: eventData.title,
    location: eventData.location,
    venueName: eventData.venueName,
    city: eventData.city,
    ticketmasterAttractionId: attractionId,
    venueId: venueId,
    source,
  });

  return {
    ...eventData,
    canonicalKey,
  };
};

/**
 * Hook that accumulates events across pagination and consolidates globally.
 * Use this for infinite scroll or "load more" patterns where you want
 * duplicate events across pages to be merged into single cards with date ranges.
 */
export function useEventsWithGlobalConsolidation(
  options: UseEventsAccumulatorOptions = {}
): UseEventsAccumulatorResult {
  const { pageSize = 20, city, segment, search, upcoming = true } = options;

  // Raw events accumulated from all loaded pages (before consolidation)
  const [rawEvents, setRawEvents] = useState<Event[]>([]);
  // Set to track unique event IDs we've already fetched (prevents duplicates from API)
  const fetchedIdsRef = useRef<Set<string>>(new Set());
  // Current page (1-indexed for display, but we use 0-indexed offset internally)
  const [currentPage, setCurrentPage] = useState(1);
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Error state
  const [error, setError] = useState<string | null>(null);
  // Total count from server
  const [totalCount, setTotalCount] = useState(0);
  // Track if last fetch returned a full page (if not, no more pages)
  const [lastFetchWasFullPage, setLastFetchWasFullPage] = useState(true);
  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track the current filter options to detect changes
  const filterKeyRef = useRef<string>('');

  // Generate a key from current filter options to detect when filters change
  const filterKey = useMemo(() => {
    return JSON.stringify({ city, segment, search, upcoming });
  }, [city, segment, search, upcoming]);

  // Consolidated events (memoized to avoid recalculating on every render)
  const consolidatedEvents = useMemo(() => {
    if (rawEvents.length === 0) return [];
    return aggregateEvents(rawEvents);
  }, [rawEvents]);

  // Check if there are more pages to load
  const hasMore = useMemo(() => {
    // No more if we haven't loaded anything yet or total is 0
    if (totalCount === 0) return false;
    // No more if last fetch returned fewer than pageSize events
    if (!lastFetchWasFullPage) return false;
    // We have more if the raw count is less than total
    return rawEvents.length < totalCount;
  }, [rawEvents.length, totalCount, lastFetchWasFullPage]);

  // Fetch a specific page of events
  const fetchPage = useCallback(async (page: number, isLoadMore: boolean = false) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams();
      params.set('limit', pageSize.toString());
      params.set('offset', offset.toString());
      if (city) params.set('city', city);
      if (segment) params.set('segment', segment);
      if (search) params.set('search', search);
      params.set('upcoming', upcoming.toString());

      // Add timeout to ensure response within 12 seconds (accumulator)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12_000);

      const response = await fetch(`/api/events?${params.toString()}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const message = `Failed to fetch events: ${response.statusText}`;
        if (!abortController.signal.aborted) {
          if (response.status === 404) {
            console.warn('[useEventsAccumulator] Events API not found (404). Showing empty list.');
            setRawEvents([]);
            setTotalCount(0);
            setError(null);
          } else {
            setError(message);
            console.error('[useEventsAccumulator] Error:', message);
          }
        }
        return;
      }

      const data = await response.json();

      if (abortController.signal.aborted) return;

      // Transform events
      const newEvents: Event[] = (data.events || []).map(transformDbEvent);

      // Filter out events we've already fetched (by ID)
      const uniqueNewEvents = newEvents.filter(evt => {
        if (fetchedIdsRef.current.has(evt.id)) {
          return false;
        }
        fetchedIdsRef.current.add(evt.id);
        return true;
      });

      // Update state
      if (isLoadMore) {
        // Append to existing raw events
        setRawEvents(prev => [...prev, ...uniqueNewEvents]);
      } else {
        // Replace raw events (initial load or reset)
        setRawEvents(uniqueNewEvents);
      }

      setTotalCount(data.count || 0);
      setCurrentPage(page);
      // Track if we got a full page - if not, there are no more pages
      setLastFetchWasFullPage(newEvents.length >= pageSize);

      if (typeof window !== 'undefined') {
        console.log('[useEventsAccumulator] Fetched page:', {
          page,
          newEventsCount: newEvents.length,
          uniqueNewEventsCount: uniqueNewEvents.length,
          totalRawEvents: isLoadMore ? rawEvents.length + uniqueNewEvents.length : uniqueNewEvents.length,
          totalCount: data.count,
        });
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      if (!abortController.signal.aborted) {
        setError(errorMessage);
        console.error('[useEventsAccumulator] Error:', err);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [pageSize, city, segment, search, upcoming, rawEvents.length]);

  // Reset and fetch from the beginning
  const reset = useCallback(async () => {
    setRawEvents([]);
    fetchedIdsRef.current.clear();
    setCurrentPage(1);
    setTotalCount(0);
    setLastFetchWasFullPage(true);
    await fetchPage(1, false);
  }, [fetchPage]);

  // Load more (next page)
  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    await fetchPage(currentPage + 1, true);
  }, [currentPage, loadingMore, loading, hasMore, fetchPage]);

  // Initial fetch and reset when filters change
  useEffect(() => {
    if (filterKeyRef.current !== filterKey) {
      filterKeyRef.current = filterKey;
      // Filters changed, reset everything
      setRawEvents([]);
      fetchedIdsRef.current.clear();
      setCurrentPage(1);
      setTotalCount(0);
      setLastFetchWasFullPage(true);
      fetchPage(1, false);
    }
  }, [filterKey, fetchPage]);

  // Initial fetch on mount
  useEffect(() => {
    if (rawEvents.length === 0 && !loading && !error) {
      fetchPage(1, false);
    }
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [rawEvents.length, loading, error, fetchPage]);

  return {
    events: consolidatedEvents,
    rawEventCount: rawEvents.length,
    loading,
    loadingMore,
    error,
    totalCount,
    consolidatedCount: consolidatedEvents.length,
    hasMore,
    loadMore,
    reset,
    currentPage,
  };
}

// Export aggregateEvents for testing or external use
export { aggregateEvents, buildCanonicalKey, isSameEventSeries };

