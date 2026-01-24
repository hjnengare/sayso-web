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
        const city = dbEvent.city;
        const bookingUrl = dbEvent.ticket_url || dbEvent.booking_url || dbEvent.url || undefined;

        // Extract attraction ID and venue ID from raw_data (Ticketmaster API response)
        // This is critical for proper event consolidation
        const rawData = dbEvent.raw_data;
        const attractionId = extractAttractionId(rawData) ||
          dbEvent.ticketmaster_attraction_id ||
          dbEvent.attraction_id ||
          null;
        const venueId = extractVenueId(rawData) ||
          dbEvent.venue_id ||
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

