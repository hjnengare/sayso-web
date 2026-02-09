import {
  normalizeText,
  buildDedupeKey,
  buildLocationString,
  formatIsoNoMs,
  sleep,
  log,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TmImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
}

interface TmVenue {
  name?: string;
  city?: { name?: string };
  country?: { name?: string };
  address?: { line1?: string; line2?: string };
}

interface TmEvent {
  id: string;
  name: string;
  info?: string;
  description?: string;
  url?: string;
  images?: TmImage[];
  dates?: {
    start?: { dateTime?: string; localDate?: string };
    end?: { dateTime?: string; localDate?: string };
  };
  _embedded?: { venues?: TmVenue[] };
  priceRanges?: Array<{ min?: number; max?: number; currency?: string }>;
  classifications?: Array<{
    segment?: { name?: string };
    genre?: { name?: string };
    subGenre?: { name?: string };
  }>;
}

interface TmResponse {
  _embedded?: { events?: TmEvent[] };
  page?: {
    number?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

/** Row shape matching public.events_and_specials (minus auto-generated id). */
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
  price: null;
  rating: number;
  booking_url: string | null;
  booking_contact: null;
}

export interface FetchConfig {
  apiKey: string;
  cities: string[];
  systemBusinessId: string;
  systemUserId: string;
  fetchWindowDays: number;
  pageSize: number;
}

export interface FetchResult {
  fetchedCount: number;
  mappedCount: number;
  consolidatedCount: number;
  rows: EventRow[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TM_BASE_URL =
  "https://app.ticketmaster.com/discovery/v2/events.json";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const FETCH_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickBestImage(images: TmImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  let best = images[0];
  for (const img of images) {
    if ((img.width ?? 0) > (best.width ?? 0)) {
      best = img;
    }
  }
  return best.url || null;
}

function resolveStartDate(dates: TmEvent["dates"]): string | null {
  if (dates?.start?.dateTime) return new Date(dates.start.dateTime).toISOString();
  if (dates?.start?.localDate) return new Date(dates.start.localDate + "T00:00:00Z").toISOString();
  return null;
}

function resolveEndDate(dates: TmEvent["dates"], fallbackStart: string): string | null {
  if (dates?.end?.dateTime) return new Date(dates.end.dateTime).toISOString();
  if (dates?.end?.localDate) return new Date(dates.end.localDate + "T23:59:59Z").toISOString();
  return fallbackStart;
}

function buildDescription(event: TmEvent): string | null {
  if (event.info && event.info.trim().length > 0) return event.info.trim();
  if (event.description && event.description.trim().length > 0) return event.description.trim();

  // Build a fallback from classification + venue data
  const parts: string[] = [];

  const cls = event.classifications?.[0];
  if (cls) {
    const segment = cls.segment?.name;
    const genre = cls.genre?.name;
    const subGenre = cls.subGenre?.name;
    // e.g. "Music · Rock · Alternative Rock"
    const tags = [segment, genre, subGenre].filter(
      (t): t is string => !!t && t !== "Undefined" && t !== "Other"
    );
    if (tags.length > 0) parts.push(tags.join(" · "));
  }

  const venue = event._embedded?.venues?.[0];
  if (venue?.name) {
    parts.push(`at ${venue.name}`);
  }

  return parts.length > 0 ? parts.join(" — ") : null;
}

// ---------------------------------------------------------------------------
// Fetch a single page from Ticketmaster
// ---------------------------------------------------------------------------

async function fetchPage(
  apiKey: string,
  city: string,
  startDateTime: string,
  endDateTime: string,
  size: number,
  page: number
): Promise<TmResponse> {
  const url = new URL(TM_BASE_URL);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("countryCode", "ZA");
  url.searchParams.set("city", city);
  url.searchParams.set("sort", "date,asc");
  url.searchParams.set("size", String(size));
  url.searchParams.set("page", String(page));
  url.searchParams.set("startDateTime", startDateTime);
  url.searchParams.set("endDateTime", endDateTime);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 429) {
        // Rate-limited — wait and retry
        const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
        log.warn(`Rate-limited by Ticketmaster. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`TM API ${res.status}: ${body.slice(0, 200)}`);
      }

      return (await res.json()) as TmResponse;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 10_000;
        log.warn(
          `Fetch attempt ${attempt + 1} failed for ${city} page ${page}: ${lastError.message}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("fetchPage failed after retries");
}

// ---------------------------------------------------------------------------
// Fetch all pages for a city
// ---------------------------------------------------------------------------

async function fetchEventsForCity(
  apiKey: string,
  city: string,
  startDateTime: string,
  endDateTime: string,
  pageSize: number
): Promise<TmEvent[]> {
  const allEvents: TmEvent[] = [];
  let currentPage = 0;
  let totalPages = 1;

  while (currentPage < totalPages) {
    const response = await fetchPage(apiKey, city, startDateTime, endDateTime, pageSize, currentPage);
    const events = response._embedded?.events ?? [];
    allEvents.push(...events);

    totalPages = response.page?.totalPages ?? 1;
    currentPage++;

    // Safety cap: don't fetch more than 10 pages (pageSize * 10 events)
    if (currentPage >= 10) {
      log.warn(`Reached page cap (10) for ${city}. Stopping pagination.`);
      break;
    }

    // Small delay between pages to be polite
    if (currentPage < totalPages) {
      await sleep(500);
    }
  }

  return allEvents;
}

// ---------------------------------------------------------------------------
// Map a single TM event → EventRow
// ---------------------------------------------------------------------------

function mapTmEvent(
  event: TmEvent,
  systemBusinessId: string,
  systemUserId: string
): EventRow | null {
  try {
    const title = event.name?.trim() || "Untitled event";
    const startDate = resolveStartDate(event.dates);
    if (!startDate) return null; // Cannot store an event without a start date

    const endDate = resolveEndDate(event.dates, startDate);
    const venue = event._embedded?.venues?.[0];
    const location = buildLocationString(
      venue?.name,
      venue?.city?.name,
      venue?.country?.name
    );

    return {
      title,
      type: "event",
      business_id: systemBusinessId,
      created_by: systemUserId,
      start_date: startDate,
      end_date: endDate,
      location,
      description: buildDescription(event),
      icon: "ticketmaster",
      image: pickBestImage(event.images),
      price: null,
      rating: 0,
      booking_url: event.url ?? null,
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
  const map = new Map<string, EventRow & { _imageWidth: number }>();

  for (const row of rows) {
    const key = buildDedupeKey(row.title, row.start_date, row.location);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...row, _imageWidth: 0 });
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

    // Keep richest description (longest text)
    if (row.description && (!existing.description || row.description.length > existing.description.length)) {
      existing.description = row.description;
    }

    // Keep best image (we don't have width at this point, prefer non-null)
    if (row.image && !existing.image) {
      existing.image = row.image;
    }

    // Keep booking URL if missing
    if (row.booking_url && !existing.booking_url) {
      existing.booking_url = row.booking_url;
    }
  }

  // Strip internal _imageWidth before returning
  return Array.from(map.values()).map(({ _imageWidth, ...row }) => row);
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function fetchAndProcessAll(config: FetchConfig): Promise<FetchResult> {
  const now = new Date();
  const endWindow = new Date(now.getTime() + config.fetchWindowDays * 24 * 60 * 60 * 1000);
  const startDateTime = formatIsoNoMs(now);
  const endDateTime = formatIsoNoMs(endWindow);

  let totalFetched = 0;
  let totalMapped = 0;
  const allRows: EventRow[] = [];

  for (const city of config.cities) {
    log.info(`Fetching events for "${city}"...`);
    try {
      const tmEvents = await fetchEventsForCity(
        config.apiKey,
        city,
        startDateTime,
        endDateTime,
        config.pageSize
      );

      totalFetched += tmEvents.length;
      log.info(`  Fetched ${tmEvents.length} raw events for "${city}".`);

      const mapped = tmEvents
        .map((e) => mapTmEvent(e, config.systemBusinessId, config.systemUserId))
        .filter((r): r is EventRow => r !== null);

      totalMapped += mapped.length;
      log.info(`  Mapped ${mapped.length} valid events for "${city}".`);

      allRows.push(...mapped);
    } catch (err) {
      log.error(`Failed to fetch events for "${city}": ${err}`);
      // Continue with other cities
    }

    // Small delay between cities
    if (config.cities.indexOf(city) < config.cities.length - 1) {
      await sleep(1_000);
    }
  }

  const consolidated = consolidateEvents(allRows);

  log.info(
    `Consolidation: ${allRows.length} mapped → ${consolidated.length} unique events.`
  );

  return {
    fetchedCount: totalFetched,
    mappedCount: totalMapped,
    consolidatedCount: consolidated.length,
    rows: consolidated,
  };
}
