// Supabase Edge Function: Ticketmaster → events_and_specials ingestor
//
// Full pipeline: fetch (multi-city, paginated, retried) → map → consolidate → cleanup → upsert
// Schedule via pg_cron + pg_net every 6 hours (see SQL at bottom of file).

// @ts-ignore — Deno runtime import
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==========================================================================
// Types
// ==========================================================================

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

interface EventRow {
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

// ==========================================================================
// Constants
// ==========================================================================

const TM_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const FETCH_TIMEOUT_MS = 25_000;
const PAGE_CAP = 5;
const BATCH_SIZE = 200;
const CLEANUP_DAYS = 14;
const FETCH_WINDOW_DAYS = 120;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ==========================================================================
// Utilities
// ==========================================================================

function normalizeText(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function buildDedupeKey(title: string, startDateIso: string, location: string | null): string {
  return `${normalizeText(title)}|${startDateIso.slice(0, 10)}|${normalizeText(location)}`;
}

function buildLocationString(
  venueName: string | null | undefined,
  city: string | null | undefined,
  country: string | null | undefined,
): string | null {
  const parts = [venueName, city, country].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(" \u2022 ") : null;
}

/** ISO 8601 without milliseconds — Ticketmaster can 400 with ms. */
function formatIsoNoMs(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jsonOk(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

async function userExists(supabase: SupabaseClient, userId: string): Promise<boolean> {
  if (!isUuid(userId)) return false;

  try {
    const { data, error } = await supabase
      .schema("auth")
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data?.id) return true;
  } catch (error) {
    console.warn("[Ingest] Could not validate user via auth.users; falling back to profiles:", error);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) return false;
  return !!profile?.user_id;
}

async function resolveCreatedByUserId(
  supabase: SupabaseClient,
  businessId: string,
  configuredUserId?: string | null
): Promise<string> {
  if (configuredUserId && (await userExists(supabase, configuredUserId))) {
    return configuredUserId;
  }

  if (configuredUserId) {
    console.warn(
      `[Ingest] SYSTEM_USER_ID is invalid or missing in auth.users: ${configuredUserId}. Falling back.`
    );
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!businessError && isUuid((business as { owner_id?: string | null } | null)?.owner_id) &&
    (await userExists(supabase, (business as { owner_id: string }).owner_id))) {
    return (business as { owner_id: string }).owner_id;
  }

  const ownerCandidate = (business as { owner_id?: string | null } | null)?.owner_id;
  if (isUuid(ownerCandidate)) {
    console.warn(
      `[Ingest] businesses.owner_id is set but invalid for FK: ${ownerCandidate}. Falling back.`
    );
  }

  const { data: fallbackProfile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();

  const fallbackUserId = (fallbackProfile as { user_id?: string | null } | null)?.user_id;
  if (!profileError && isUuid(fallbackUserId)) {
    return fallbackUserId;
  }

  throw new Error(
    "Unable to resolve a valid created_by user. Set SYSTEM_USER_ID to an existing auth.users UUID or set businesses.owner_id on SYSTEM_BUSINESS_ID."
  );
}

// ==========================================================================
// Ticketmaster fetch helpers
// ==========================================================================

function pickBestImage(images: TmImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  let best = images[0];
  for (const img of images) {
    if ((img.width ?? 0) > (best.width ?? 0)) best = img;
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

  const parts: string[] = [];

  const cls = event.classifications?.[0];
  if (cls) {
    const tags = [cls.segment?.name, cls.genre?.name, cls.subGenre?.name].filter(
      (t): t is string => !!t && t !== "Undefined" && t !== "Other"
    );
    if (tags.length > 0) parts.push(tags.join(" \u00b7 "));
  }

  const venue = event._embedded?.venues?.[0];
  if (venue?.name) parts.push(`at ${venue.name}`);

  return parts.length > 0 ? parts.join(" \u2014 ") : null;
}

// ==========================================================================
// Fetch one page with retries
// ==========================================================================

async function fetchPage(
  apiKey: string,
  city: string,
  startDateTime: string,
  endDateTime: string,
  size: number,
  page: number,
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
        const wait = parseInt(res.headers.get("retry-after") || "5", 10);
        console.warn(`[TM] Rate-limited. Waiting ${wait}s...`);
        await sleep(wait * 1000);
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
        console.warn(
          `[TM] Attempt ${attempt + 1} failed (${city} p${page}): ${lastError.message}. Retrying in ${delay}ms...`,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("fetchPage failed after retries");
}

// ==========================================================================
// Fetch all pages for one city
// ==========================================================================

async function fetchEventsForCity(
  apiKey: string,
  city: string,
  startDateTime: string,
  endDateTime: string,
  pageSize: number,
): Promise<TmEvent[]> {
  const all: TmEvent[] = [];
  let currentPage = 0;
  let totalPages = 1;

  while (currentPage < totalPages) {
    const resp = await fetchPage(apiKey, city, startDateTime, endDateTime, pageSize, currentPage);
    all.push(...(resp._embedded?.events ?? []));

    totalPages = resp.page?.totalPages ?? 1;
    currentPage++;

    if (currentPage >= PAGE_CAP) {
      console.warn(`[TM] Page cap (${PAGE_CAP}) reached for "${city}".`);
      break;
    }
    if (currentPage < totalPages) await sleep(400);
  }

  return all;
}

// ==========================================================================
// Map TM event → EventRow
// ==========================================================================

function mapTmEvent(event: TmEvent, businessId: string, userId: string): EventRow | null {
  try {
    const title = event.name?.trim() || "Untitled event";
    const startDate = resolveStartDate(event.dates);
    if (!startDate) return null;

    const endDate = resolveEndDate(event.dates, startDate);
    const venue = event._embedded?.venues?.[0];

    return {
      title,
      type: "event",
      business_id: businessId,
      created_by: userId,
      start_date: startDate,
      end_date: endDate,
      location: buildLocationString(venue?.name, venue?.city?.name, venue?.country?.name),
      description: buildDescription(event),
      icon: "ticketmaster",
      image: pickBestImage(event.images),
      price: null,
      rating: 0,
      booking_url: event.url ?? null,
      booking_contact: null,
    };
  } catch (err) {
    console.warn(`[TM] Skipping malformed event "${event.name ?? event.id}": ${err}`);
    return null;
  }
}

// ==========================================================================
// In-memory consolidation (same title + day + location)
// ==========================================================================

function consolidateEvents(rows: EventRow[]): EventRow[] {
  const map = new Map<string, EventRow>();

  for (const row of rows) {
    const key = buildDedupeKey(row.title, row.start_date, row.location);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...row });
      continue;
    }

    // Earliest start
    if (new Date(row.start_date).getTime() < new Date(existing.start_date).getTime()) {
      existing.start_date = row.start_date;
    }
    // Latest end
    if (row.end_date && existing.end_date) {
      if (new Date(row.end_date).getTime() > new Date(existing.end_date).getTime())
        existing.end_date = row.end_date;
    } else if (row.end_date && !existing.end_date) {
      existing.end_date = row.end_date;
    }
    // Richest description
    if (row.description && (!existing.description || row.description.length > existing.description.length))
      existing.description = row.description;
    // Best image (prefer non-null)
    if (row.image && !existing.image) existing.image = row.image;
    // Booking URL
    if (row.booking_url && !existing.booking_url) existing.booking_url = row.booking_url;
  }

  return Array.from(map.values());
}

// ==========================================================================
// Full fetch pipeline across all cities
// ==========================================================================

async function fetchAllCities(
  apiKey: string,
  cities: string[],
  businessId: string,
  userId: string,
  pageSize: number,
): Promise<{ fetchedCount: number; mappedCount: number; rows: EventRow[] }> {
  const now = new Date();
  const end = new Date(now.getTime() + FETCH_WINDOW_DAYS * 86_400_000);
  const startDT = formatIsoNoMs(now);
  const endDT = formatIsoNoMs(end);

  let fetchedCount = 0;
  let mappedCount = 0;
  const allRows: EventRow[] = [];

  for (const city of cities) {
    console.log(`[TM] Fetching "${city}"...`);
    try {
      const raw = await fetchEventsForCity(apiKey, city, startDT, endDT, pageSize);
      fetchedCount += raw.length;
      console.log(`[TM]   ${raw.length} raw events for "${city}".`);

      const mapped = raw
        .map((e) => mapTmEvent(e, businessId, userId))
        .filter((r): r is EventRow => r !== null);
      mappedCount += mapped.length;
      console.log(`[TM]   ${mapped.length} mapped for "${city}".`);

      allRows.push(...mapped);
    } catch (err) {
      console.error(`[TM] Failed for "${city}": ${err}`);
    }

    // Brief pause between cities
    if (cities.indexOf(city) < cities.length - 1) await sleep(800);
  }

  const consolidated = consolidateEvents(allRows);
  console.log(`[TM] Consolidated: ${allRows.length} → ${consolidated.length} unique events.`);

  return { fetchedCount, mappedCount, rows: consolidated };
}

// ==========================================================================
// Database: cleanup old events
// ==========================================================================

async function cleanupOldEvents(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - CLEANUP_DAYS * 86_400_000).toISOString();

  const { count, error } = await supabase
    .from("events_and_specials")
    .delete({ count: "exact" })
    .eq("icon", "ticketmaster")
    .eq("type", "event")
    .lt("start_date", cutoff);

  if (error) {
    console.error(`[DB] Cleanup failed: ${error.message}`);
    return 0;
  }

  const deleted = count ?? 0;
  if (deleted > 0) console.log(`[DB] Cleaned up ${deleted} old Ticketmaster events.`);
  return deleted;
}

// ==========================================================================
// Database: upsert via existing RPC
// ==========================================================================

async function upsertEvents(
  supabase: SupabaseClient,
  rows: EventRow[],
): Promise<{ inserted: number; updated: number }> {
  let totalInserted = 0;
  let totalUpdated = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const { data, error } = await supabase.rpc("upsert_events_and_specials_consolidated", {
      p_rows: batch,
    });

    if (error) {
      console.error(`[DB] Batch ${batchNum} failed: ${error.message}`);
      continue;
    }

    const first = Array.isArray(data) ? data[0] : data;
    const ins = Number(first?.inserted ?? 0);
    const upd = Number(first?.updated ?? 0);
    totalInserted += ins;
    totalUpdated += upd;

    console.log(`[DB] Batch ${batchNum}: ${ins} inserted, ${upd} updated (of ${batch.length}).`);
  }

  return { inserted: totalInserted, updated: totalUpdated };
}

// ==========================================================================
// Edge Function handler
// ==========================================================================

// @ts-ignore — Deno.serve
Deno.serve(async (req: Request) => {
  const startMs = Date.now();

  try {
    // ---- Environment ----
    // @ts-ignore
    const apiKey = Deno.env.get("TICKETMASTER_API_KEY");
    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // @ts-ignore
    const configuredSystemUserId = Deno.env.get("SYSTEM_USER_ID");
    // @ts-ignore
    const systemBusinessId = Deno.env.get("SYSTEM_BUSINESS_ID");
    // @ts-ignore
    const citiesEnv = Deno.env.get("CITIES") || "Cape Town,Johannesburg,Durban";

    if (!apiKey) return jsonError("TICKETMASTER_API_KEY not configured");
    if (!supabaseUrl || !supabaseServiceKey) return jsonError("Supabase credentials not configured");
    if (!systemBusinessId) return jsonError("SYSTEM_BUSINESS_ID not configured");

    // Allow query-param overrides (useful for manual testing)
    const reqUrl = new URL(req.url);
    const citiesParam = reqUrl.searchParams.get("cities");
    const pageSizeParam = reqUrl.searchParams.get("size");

    const cities = (citiesParam || citiesEnv)
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const pageSize = Math.min(Math.max(parseInt(pageSizeParam || "100", 10), 20), 200);

    console.log(`[Ingest] Starting. Cities: ${cities.join(", ")}, pageSize: ${pageSize}`);

    // ---- Supabase client (service_role) ----
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const createdByUserId = await resolveCreatedByUserId(
      supabase,
      systemBusinessId,
      configuredSystemUserId
    );

    // ---- 1. Cleanup old events ----
    const cleanedUp = await cleanupOldEvents(supabase);

    // ---- 2. Fetch, map, consolidate ----
    const { fetchedCount, mappedCount, rows } = await fetchAllCities(
      apiKey,
      cities,
      systemBusinessId,
      createdByUserId,
      pageSize,
    );

    if (rows.length === 0) {
      return jsonOk({
        success: true,
        message: "No events to upsert",
        fetched: fetchedCount,
        mapped: mappedCount,
        consolidated: 0,
        inserted: 0,
        updated: 0,
        cleaned_up: cleanedUp,
        elapsed_ms: Date.now() - startMs,
      });
    }

    // ---- 3. Upsert into events_and_specials ----
    const { inserted, updated } = await upsertEvents(supabase, rows);

    const elapsed = Date.now() - startMs;
    console.log(
      `[Ingest] Done in ${elapsed}ms. Fetched: ${fetchedCount}, Mapped: ${mappedCount}, ` +
        `Consolidated: ${rows.length}, Inserted: ${inserted}, Updated: ${updated}, Cleaned: ${cleanedUp}.`,
    );

    return jsonOk({
      success: true,
      fetched: fetchedCount,
      mapped: mappedCount,
      consolidated: rows.length,
      inserted,
      updated,
      cleaned_up: cleanedUp,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Ingest] Fatal: ${message}`);
    if (err instanceof Error && err.stack) console.error(err.stack);
    return jsonError(message, 500);
  }
});
