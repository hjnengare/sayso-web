import {
  buildDedupeKey,
  buildLocationString,
  stripHtml,
  sleep,
  log,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Types — Quicket API response
// ---------------------------------------------------------------------------

interface QuicketVenue {
  id?: number;
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  latitude?: number;
  longitude?: number;
}

interface QuicketLocality {
  levelOne?: string;   // country
  levelTwo?: string;   // province
  levelThree?: string; // city
}

interface QuicketCategory {
  id?: number;
  name?: string;
}

interface QuicketTicket {
  id?: number;
  name?: string;
  price?: number;
  soldOut?: boolean;
  provisionallySoldOut?: boolean;
  salesStart?: string;
  salesEnd?: string;
  description?: string | null;
  donation?: boolean;
  vendorTicket?: boolean;
}

interface QuicketEvent {
  id: number;
  name: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  dateCreated?: string;
  lastModified?: string;
  startDate?: string;
  endDate?: string;
  venue?: QuicketVenue;
  locality?: QuicketLocality;
  organiser?: {
    id?: number;
    name?: string;
  };
  categories?: QuicketCategory[];
  tickets?: QuicketTicket[];
  schedules?: unknown[];
}

interface QuicketResponse {
  results: QuicketEvent[];
  pageSize: number;
  pages: number;
  records: number;
  extras?: unknown;
  message?: string | null;
  statusCode: number;
}

/** Row shape matching public.events_and_specials. */
export interface EventRow {
  title: string;
  type: "event";
  business_id: string;
  created_by: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  icon: string;
  image: string | null;
  price: number | null;
  rating: number;
  booking_url: string | null;
  booking_contact: string | null;
}

export interface FetchConfig {
  apiKey: string;
  cities: string[];
  systemBusinessId: string;
  systemUserId: string;
  pageSize: number;
}

export interface FetchResult {
  fetchedCount: number;
  filteredCount: number;
  mappedCount: number;
  consolidatedCount: number;
  rows: EventRow[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUICKET_BASE_URL = "https://api.quicket.co.za/api/events";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const FETCH_TIMEOUT_MS = 30_000;
const MAX_PAGES = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the cheapest non-free, non-donation ticket price. */
function getCheapestPrice(tickets: QuicketTicket[] | undefined): number | null {
  if (!tickets || tickets.length === 0) return null;

  const prices = tickets
    .filter((t) => !t.donation && !t.soldOut && t.price != null && t.price > 0)
    .map((t) => t.price!);

  return prices.length > 0 ? Math.min(...prices) : null;
}

/** Build a description from the Quicket event. */
function buildDescription(event: QuicketEvent): string | null {
  // Primary: HTML description → strip tags
  if (event.description) {
    const plain = stripHtml(event.description);
    if (plain.length > 0) {
      // Cap at 500 chars to avoid storing huge HTML blobs
      return plain.length > 500 ? plain.slice(0, 497) + "..." : plain;
    }
  }

  // Fallback: category names
  const cats = event.categories
    ?.map((c) => c.name)
    .filter((n): n is string => !!n && n !== "Other");
  if (cats && cats.length > 0) {
    return cats.join(" \u00b7 ");
  }

  return null;
}

const CAPE_TOWN_CITY = "cape town";

/** Restrict to Cape Town events only. */
function isCapeTownEvent(event: QuicketEvent): boolean {
  const city = event.locality?.levelThree?.toLowerCase()?.trim();
  if (city && (city.includes(CAPE_TOWN_CITY) || CAPE_TOWN_CITY.includes(city))) {
    return true;
  }

  const addressParts = [
    event.venue?.name,
    event.venue?.addressLine1,
    event.venue?.addressLine2,
  ]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .join(" ")
    .toLowerCase();

  return addressParts.includes(CAPE_TOWN_CITY);
}

/** Keep only events starting now or in the future. */
function startsFromNow(event: QuicketEvent): boolean {
  if (!event.startDate) return false;
  const start = new Date(event.startDate);
  if (isNaN(start.getTime())) return false;
  return start.getTime() >= Date.now();
}

// ---------------------------------------------------------------------------
// Fetch a single page from Quicket
// ---------------------------------------------------------------------------

async function fetchPage(
  apiKey: string,
  pageSize: number,
  page: number
): Promise<QuicketResponse> {
  const url = new URL(QUICKET_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("page", String(page));

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
        log.warn(`Rate-limited by Quicket. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Quicket API ${res.status}: ${body.slice(0, 200)}`);
      }

      return (await res.json()) as QuicketResponse;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 10_000;
        log.warn(
          `Fetch attempt ${attempt + 1} failed (page ${page}): ${lastError.message}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("fetchPage failed after retries");
}

// ---------------------------------------------------------------------------
// Fetch all pages from Quicket
// ---------------------------------------------------------------------------

async function fetchAllEvents(
  apiKey: string,
  pageSize: number
): Promise<QuicketEvent[]> {
  const allEvents: QuicketEvent[] = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const response = await fetchPage(apiKey, pageSize, currentPage);
    const events = response.results ?? [];
    allEvents.push(...events);

    totalPages = response.pages ?? 1;

    log.info(`  Page ${currentPage}/${totalPages}: ${events.length} events (${allEvents.length} total)`);

    currentPage++;

    if (currentPage > MAX_PAGES) {
      log.warn(`Reached page cap (${MAX_PAGES}). Stopping pagination.`);
      break;
    }

    // Small delay between pages
    if (currentPage <= totalPages) {
      await sleep(500);
    }
  }

  return allEvents;
}

// ---------------------------------------------------------------------------
// Map a single Quicket event → EventRow
// ---------------------------------------------------------------------------

function mapQuicketEvent(
  event: QuicketEvent,
  systemBusinessId: string,
  systemUserId: string
): EventRow | null {
  try {
    const title = event.name?.trim();
    if (!title) return null;

    const startDate = event.startDate ? new Date(event.startDate) : null;
    if (!startDate || isNaN(startDate.getTime())) return null;

    const endDate = event.endDate ? new Date(event.endDate) : null;
    const endDateIso =
      endDate && !isNaN(endDate.getTime()) ? endDate.toISOString() : null;

    const location = buildLocationString(
      event.venue?.name,
      event.locality?.levelThree,
      event.locality?.levelOne
    );

    return {
      title,
      type: "event",
      business_id: systemBusinessId,
      created_by: systemUserId,
      start_date: startDate.toISOString(),
      end_date: endDateIso,
      location,
      description: buildDescription(event),
      icon: "quicket",
      image: event.imageUrl
        ? event.imageUrl.startsWith("//")
          ? `https:${event.imageUrl}`
          : event.imageUrl
        : null,
      price: getCheapestPrice(event.tickets),
      rating: 0,
      booking_url: event.url || null,
      booking_contact: null,
    };
  } catch (err) {
    log.warn(`Skipping malformed event "${event.name ?? event.id}": ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Consolidate duplicates within one fetch run
// ---------------------------------------------------------------------------

function consolidateEvents(rows: EventRow[]): EventRow[] {
  const map = new Map<string, EventRow>();

  for (const row of rows) {
    const key = buildDedupeKey(row.title, row.start_date, row.location);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...row });
      continue;
    }

    // Keep earliest start_date
    if (new Date(row.start_date).getTime() < new Date(existing.start_date).getTime()) {
      existing.start_date = row.start_date;
    }

    // Keep latest end_date
    if (row.end_date && existing.end_date) {
      if (new Date(row.end_date).getTime() > new Date(existing.end_date).getTime()) {
        existing.end_date = row.end_date;
      }
    } else if (row.end_date && !existing.end_date) {
      existing.end_date = row.end_date;
    }

    // Keep richest description
    if (row.description && (!existing.description || row.description.length > existing.description.length)) {
      existing.description = row.description;
    }

    // Keep image if missing
    if (row.image && !existing.image) {
      existing.image = row.image;
    }

    // Keep booking URL if missing
    if (row.booking_url && !existing.booking_url) {
      existing.booking_url = row.booking_url;
    }

    // Keep cheapest price
    if (row.price != null) {
      if (existing.price == null || row.price < existing.price) {
        existing.price = row.price;
      }
    }
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function fetchAndProcessAll(config: FetchConfig): Promise<FetchResult> {
  log.info("Fetching all events from Quicket...");

  const allEvents = await fetchAllEvents(config.apiKey, config.pageSize);

  log.info(`Fetched ${allEvents.length} total events from Quicket.`);

  // Client-side filter: SA only, target cities, upcoming
  const filtered = allEvents.filter((event) => {
    // Must be South African
    const country = event.locality?.levelOne?.toLowerCase()?.trim();
    if (country && country !== "south africa") return false;

    // Must start now or later
    if (!startsFromNow(event)) return false;

    // Must be in Cape Town
    if (!isCapeTownEvent(event)) return false;

    return true;
  });

  log.info(
    `Filtered: ${allEvents.length} total → ${filtered.length} matching (SA + cities + upcoming).`
  );

  // Map to EventRow
  const mapped = filtered
    .map((e) => mapQuicketEvent(e, config.systemBusinessId, config.systemUserId))
    .filter((r): r is EventRow => r !== null);

  log.info(`Mapped ${mapped.length} valid events.`);

  // Consolidate
  const consolidated = consolidateEvents(mapped);

  log.info(
    `Consolidation: ${mapped.length} mapped → ${consolidated.length} unique events.`
  );

  return {
    fetchedCount: allEvents.length,
    filteredCount: filtered.length,
    mappedCount: mapped.length,
    consolidatedCount: consolidated.length,
    rows: consolidated,
  };
}
