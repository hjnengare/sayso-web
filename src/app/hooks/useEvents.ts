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
      
      // Transform database events to Event type (optimized)
      const transformedEvents: Event[] = (data.events || []).map((dbEvent: any) => ({
        id: dbEvent.ticketmaster_id || dbEvent.id,
        title: dbEvent.title || 'Untitled Event',
        type: 'event' as const,
        image: dbEvent.image_url || null,
        alt: `${dbEvent.title} at ${dbEvent.venue_name || dbEvent.city || 'location'}`,
        icon: getIcon(dbEvent.segment, dbEvent.genre),
        location: dbEvent.venue_name || dbEvent.city || 'Location TBD',
        rating: 4.5,
        startDate: formatDate(dbEvent.start_date),
        endDate: dbEvent.end_date ? formatDate(dbEvent.end_date) : undefined,
        price: formatPrice(dbEvent.price_range),
        description: dbEvent.description || undefined,
        href: `/event/${dbEvent.ticketmaster_id || dbEvent.id}`,
      }));

      if (!abortController.signal.aborted) {
        setEvents(transformedEvents);
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

