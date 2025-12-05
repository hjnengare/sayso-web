// Supabase Edge Function: Fetch Ticketmaster Events
// This function fetches events from Ticketmaster API and stores them in the database
// @deno-types="https://deno.land/x/types/react/index.d.ts"

// @ts-ignore - Deno runtime imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

interface TicketmasterEvent {
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

interface TicketmasterResponse {
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

// @ts-ignore - Deno.serve is available in Deno runtime
Deno.serve(async (req) => {
  try {
    // Get environment variables
    // @ts-ignore - Deno.env is available in Deno runtime
    const apiKey = Deno.env.get("TICKETMASTER_API_KEY");
    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "TICKETMASTER_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request parameters
    const url = new URL(req.url);
    const city = url.searchParams.get("city") || "Cape Town";
    const size = parseInt(url.searchParams.get("size") || "50", 10);
    const page = parseInt(url.searchParams.get("page") || "0", 10);
    const keyword = url.searchParams.get("keyword") || undefined;

    // Build Ticketmaster API URL
    const ticketmasterUrl = new URL(TICKETMASTER_BASE_URL);
    ticketmasterUrl.searchParams.set("apikey", apiKey);
    ticketmasterUrl.searchParams.set("size", size.toString());
    ticketmasterUrl.searchParams.set("page", page.toString());
    if (city) ticketmasterUrl.searchParams.set("city", city);
    if (keyword) ticketmasterUrl.searchParams.set("keyword", keyword);

    // Fetch from Ticketmaster API
    const ticketmasterResponse = await fetch(ticketmasterUrl.toString());
    if (!ticketmasterResponse.ok) {
      const errorText = await ticketmasterResponse.text();
      return new Response(
        JSON.stringify({
          error: `Ticketmaster API error: ${ticketmasterResponse.status}`,
          details: errorText,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const ticketmasterData: TicketmasterResponse = await ticketmasterResponse.json();
    const events = ticketmasterData._embedded?.events || [];

    if (events.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No events found",
          events_processed: 0,
          events_stored: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Transform and store events
    const eventsToUpsert = events.map((event) => {
      const venue = event._embedded?.venues?.[0];

      return {
        ticketmaster_id: event.id,
        title: event.name,
        description: event.info || event.description || null,
        type: "event" as const,
        start_date: event.dates?.start?.dateTime
          ? new Date(event.dates.start.dateTime).toISOString()
          : event.dates?.start?.localDate
          ? new Date(event.dates.start.localDate + "T00:00:00").toISOString()
          : null,
        end_date: event.dates?.end?.dateTime
          ? new Date(event.dates.end.dateTime).toISOString()
          : event.dates?.end?.localDate
          ? new Date(event.dates.end.localDate + "T23:59:59").toISOString()
          : null,
        location: venue?.name || venue?.address?.line1 || null,
        city: venue?.city?.name || null,
        country: venue?.country?.name || null,
        venue_name: venue?.name || null,
        venue_address: [venue?.address?.line1, venue?.address?.line2]
          .filter(Boolean)
          .join(" ") || null,
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
    });

    // Upsert events into database
    const { data, error } = await supabase
      .from("ticketmaster_events")
      .upsert(eventsToUpsert, {
        onConflict: "ticketmaster_id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to store events",
          details: error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const inserted = data?.length || 0;
    const updated = events.length - inserted;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${events.length} events`,
        events_processed: events.length,
        events_stored: inserted + updated,
        inserted,
        updated,
        page: ticketmasterData.page,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error?.message || "Unknown error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

