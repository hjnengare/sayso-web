/**
 * Service for fetching and managing Ticketmaster events
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface TicketmasterEvent {
  id: string;
  name: string;
  info?: string;
  description?: string;
  url?: string;
  images?: Array<{ url: string }>;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
    };
    end?: {
      dateTime?: string;
      localDate?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
      country?: { name?: string };
      address?: {
        line1?: string;
        line2?: string;
      };
    }>;
  };
  priceRanges?: Array<any>;
  classifications?: Array<{
    segment?: { name?: string };
    genre?: { name?: string };
    subGenre?: { name?: string };
  }>;
}

export interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
  page?: {
    number?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

export interface FetchEventsOptions {
  keyword?: string;
  city?: string;
  size?: number;
  page?: number;
}

export interface FetchEventsResult {
  success: boolean;
  message: string;
  events_processed: number;
  events_stored: number;
  inserted: number;
  updated: number;
  page?: {
    number?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
  timestamp: string;
}

export class TicketmasterService {
  private static readonly BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

  /**
   * Fetch events from Ticketmaster API
   */
  static async fetchEventsFromAPI(
    apiKey: string,
    options: FetchEventsOptions = {}
  ): Promise<TicketmasterResponse> {
    const { keyword, city, size = 20, page = 0 } = options;

    const url = new URL(this.BASE_URL);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('size', size.toString());
    url.searchParams.set('page', page.toString());

    if (keyword) {
      url.searchParams.set('keyword', keyword);
    }
    if (city) {
      url.searchParams.set('city', city);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Ticketmaster API error: ${response.status} ${response.statusText}`;
      
      // Provide more helpful error messages
      if (response.status === 410) {
        errorMessage += ' - The API endpoint has been deprecated or removed. Please check the Ticketmaster API documentation for the current endpoint.';
      } else if (response.status === 401) {
        errorMessage += ' - Invalid API key. Please check your TICKETMASTER_API_KEY.';
      } else if (response.status === 403) {
        errorMessage += ' - API key does not have permission to access this resource.';
      } else if (response.status === 429) {
        errorMessage += ' - Rate limit exceeded. Please wait before making more requests.';
      }
      
      if (errorText) {
        errorMessage += ` Response: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Log warning if response structure is unexpected
    if (!data._embedded && !data._embedded?.events) {
      console.warn('[TicketmasterService] Unexpected API response structure:', {
        hasEmbedded: !!data._embedded,
        hasEvents: !!data._embedded?.events,
        keys: Object.keys(data),
      });
    }
    
    return data;
  }

  /**
   * Transform Ticketmaster event to database format
   */
  private static transformEvent(event: TicketmasterEvent) {
    const venue = event._embedded?.venues?.[0];

    return {
      ticketmaster_id: event.id,
      title: event.name,
      description: event.info || event.description || null,
      type: 'event' as const,
      start_date: event.dates?.start?.dateTime
        ? new Date(event.dates.start.dateTime).toISOString()
        : event.dates?.start?.localDate
        ? new Date(event.dates.start.localDate + 'T00:00:00').toISOString()
        : null,
      end_date: event.dates?.end?.dateTime
        ? new Date(event.dates.end.dateTime).toISOString()
        : event.dates?.end?.localDate
        ? new Date(event.dates.end.localDate + 'T23:59:59').toISOString()
        : null,
      location: venue?.name || venue?.address?.line1 || null,
      city: venue?.city?.name || null,
      country: venue?.country?.name || null,
      venue_name: venue?.name || null,
      venue_address: [venue?.address?.line1, venue?.address?.line2]
        .filter(Boolean)
        .join(' ') || null,
      image_url: event.images?.[0]?.url || null,
      url: event.url || null,
      price_range: event.priceRanges || null,
      classification: event.classifications?.[0]?.segment?.name || null,
      segment: event.classifications?.[0]?.segment?.name || null,
      genre: event.classifications?.[0]?.genre?.name || null,
      sub_genre: event.classifications?.[0]?.subGenre?.name || null,
      raw_data: event,
      updated_at: new Date().toISOString(),
      last_fetched_at: new Date().toISOString(),
    };
  }

  /**
   * Store events in the database
   */
  static async storeEventsInDatabase(
    supabase: SupabaseClient,
    events: TicketmasterEvent[]
  ): Promise<{ inserted: number; updated: number }> {
    if (events.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    const eventsToUpsert = events.map((event) => this.transformEvent(event));

    const { data, error } = await supabase
      .from('ticketmaster_events')
      .upsert(eventsToUpsert, {
        onConflict: 'ticketmaster_id',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      throw new Error(`Failed to store events in database: ${error.message}`);
    }

    // Count inserted vs updated (simplified - assumes all are new if no error)
    // In a real scenario, you might want to check existing records first
    const inserted = data?.length || 0;
    const updated = events.length - inserted;

    return { inserted, updated };
  }

  /**
   * Fetch events from Ticketmaster and store them in the database
   */
  static async fetchAndStoreEvents(
    supabase: SupabaseClient,
    apiKey: string,
    options: FetchEventsOptions = {}
  ): Promise<FetchEventsResult> {
    try {
      // Fetch events from Ticketmaster API
      const ticketmasterData = await this.fetchEventsFromAPI(apiKey, options);
      const events = ticketmasterData._embedded?.events || [];

      if (events.length === 0) {
        return {
          success: true,
          message: 'No events found',
          events_processed: 0,
          events_stored: 0,
          inserted: 0,
          updated: 0,
          page: ticketmasterData.page,
          timestamp: new Date().toISOString(),
        };
      }

      // Store events in database
      const { inserted, updated } = await this.storeEventsInDatabase(supabase, events);

      return {
        success: true,
        message: `Successfully processed ${events.length} events`,
        events_processed: events.length,
        events_stored: inserted + updated,
        inserted,
        updated,
        page: ticketmasterData.page,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[TicketmasterService] Error fetching and storing events:', error);
      throw error;
    }
  }
}

