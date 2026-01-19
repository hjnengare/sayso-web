import { useState, useEffect, useCallback, useRef } from 'react';
import type { Event } from '../data/eventsData';

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

// Optimized date formatter (cached)
const dateFormatter = new Intl.DateTimeFormat('en-US', { 
  month: 'short', 
  day: 'numeric',
});

// Optimized icon mapper
const getIcon = (segment: string | null, genre: string | null): string => {
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

const toTime = (value?: string) => {
  const d = value ? new Date(value) : null;
  const t = d && !isNaN(d.getTime()) ? d.getTime() : null;
  return t;
};

const withinDays = (a?: string, b?: string, days = 7) => {
  const ta = toTime(a);
  const tb = toTime(b);
  if (ta == null || tb == null) return false;
  const diff = Math.abs(ta - tb);
  return diff <= days * 24 * 60 * 60 * 1000;
};

const isRangeConnected = (aStart?: string, aEnd?: string, bStart?: string, bEnd?: string) => {
  const dayMs = 24 * 60 * 60 * 1000;
  const aS = toTime(aStart);
  const aE = toTime(aEnd || aStart);
  const bS = toTime(bStart);
  const bE = toTime(bEnd || bStart);
  if (aS == null || aE == null || bS == null || bE == null) return false;
  const overlap = (bS <= aE) && (bE >= aS);
  const adjacentForward = bS >= aE && (bS - aE) <= dayMs;
  const adjacentBackward = aS >= bE && (aS - bE) <= dayMs;
  return overlap || adjacentForward || adjacentBackward;
};

const buildCanonicalKey = (event: Partial<Event> & { id?: string; ticketmasterAttractionId?: string; venueId?: string; title?: string; location?: string; source?: string }) => {
  if (event.source === 'ticketmaster') {
    if (event.ticketmasterAttractionId && event.venueId) {
      return `ticketmaster:attr:${event.ticketmasterAttractionId}:venue:${event.venueId}`;
    }
    if (event.id) return `ticketmaster:${event.id}`;
  }
  if (event.id) return event.id;
  return `${normalize(event.title)}|${normalize(event.location)}`;
};

const isFallbackMatch = (a: Event, b: Event) => {
  const titleMatch = normalize(a.title) === normalize(b.title);
  const venueMatch = (a.venueId && b.venueId && a.venueId === b.venueId) || normalize(a.location) === normalize(b.location) || normalize(a.venueName) === normalize(b.venueName);
  const cityMatch = normalize(a.city) === normalize(b.city);
  const connected = isRangeConnected(a.startDateISO || a.startDate, a.endDateISO || a.endDate, b.startDateISO || b.startDate, b.endDateISO || b.endDate);
  // Also allow a looser 14-day window as a safety net
  const dateWindow = withinDays(a.startDateISO || a.startDate, b.startDateISO || b.startDate, 14);
  return titleMatch && venueMatch && cityMatch && (connected || dateWindow);
};

const aggregateEvents = (events: Event[]): Event[] => {
  const map = new Map<string, Event & { occurrences: Array<{ startDate: string; endDate?: string; bookingUrl?: string }>; startDateISO?: string; endDateISO?: string }>();

  for (const evt of events) {
    const primaryKey = evt.canonicalKey || buildCanonicalKey(evt);
    const startISO = evt.startDateISO || evt.startDate;
    const endISO = evt.endDateISO || evt.endDate;

    let keyToUse = primaryKey;

    if (!map.has(primaryKey)) {
      // try fallback matching against existing entries
      for (const [existingKey, existing] of map.entries()) {
        if (isFallbackMatch(existing, evt)) {
          keyToUse = existingKey;
          break;
        }
      }
    }

    const existing = map.get(keyToUse);
    if (!existing) {
      map.set(keyToUse, {
        ...evt,
        canonicalKey: keyToUse,
        startDateISO: startISO,
        endDateISO: endISO,
        occurrences: [{ startDate: startISO, endDate: endISO, bookingUrl: evt.bookingUrl || evt.purchaseUrl }],
      });
      continue;
    }

    const occurrences = existing.occurrences ? [...existing.occurrences] : [];
    occurrences.push({ startDate: startISO, endDate: endISO, bookingUrl: evt.bookingUrl || evt.purchaseUrl });

    const allStarts = occurrences.map((o) => o.startDate).filter(Boolean);
    const allEnds = occurrences.map((o) => o.endDate).filter(Boolean);

    const minStart = allStarts.length ? allStarts.slice().sort()[0] : existing.startDateISO;
    const maxEnd = allEnds.length ? allEnds.slice().sort()[allEnds.length - 1] : existing.endDateISO;

    map.set(keyToUse, {
      ...existing,
      occurrences,
      startDateISO: minStart,
      endDateISO: maxEnd,
      startDate: minStart ? formatDate(minStart) : existing.startDate,
      endDate: maxEnd ? formatDate(maxEnd) : existing.endDate,
      href: existing.href || evt.href,
      bookingUrl: existing.bookingUrl || evt.bookingUrl,
      purchaseUrl: existing.purchaseUrl || evt.purchaseUrl,
    });
  }

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

      // Add timeout to ensure response within 2 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`/api/events?${params.toString()}`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
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
        const venueId = dbEvent.venue_id || dbEvent.venueId;
        const city = dbEvent.city;
        const attractionId = dbEvent.ticketmaster_attraction_id || dbEvent.attraction_id;
        const bookingUrl = dbEvent.ticket_url || dbEvent.booking_url || undefined;

        return {
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
          canonicalKey: buildCanonicalKey({ id, title: dbEvent.title, location: dbEvent.venue_name || dbEvent.city, source, ticketmasterAttractionId: attractionId, venueId }),
          occurrences: [{ startDate: startISO, endDate: endISO, bookingUrl }],
        };
      });

      if (!abortController.signal.aborted) {
        setEvents(aggregateEvents(transformedEvents));
        setCount(data.count || 0);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      if (!abortController.signal.aborted) {
        setError(errorMessage);
        console.error('[useEvents] Error:', err);
      }
    } finally {
      if (!abortController.signal.aborted) {
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

