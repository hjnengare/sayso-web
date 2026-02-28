import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Ticketmaster API types
// ---------------------------------------------------------------------------

interface TmImage { url: string; width?: number }

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
    status?: { code?: string };
  };
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
      country?: { name?: string };
    }>;
  };
  classifications?: Array<{
    segment?: { name?: string };
    genre?: { name?: string };
    subGenre?: { name?: string };
  }>;
}

interface TmResponse {
  _embedded?: { events?: TmEvent[] };
  page?: { number?: number; totalPages?: number };
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
  availability_status: 'sold_out' | null;
}

interface BatchFailure {
  batch: number;
  rows: number;
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TM_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const CITIES = ["Cape Town", "Johannesburg", "Durban"];
const PAGE_SIZE = 200;
const FETCH_WINDOW_DAYS = 120;
const BATCH_SIZE = 200;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeText(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function buildDedupeKey(title: string, startDate: string, location: string | null): string {
  return `${normalizeText(title)}|${startDate.slice(0, 10)}|${normalizeText(location)}`;
}

function buildLocation(venue?: string | null, city?: string | null, country?: string | null): string | null {
  const parts = [venue, city, country].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return parts.length > 0 ? parts.join(" \u2022 ") : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function formatIsoNoMs(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function pickBestImage(images?: TmImage[]): string | null {
  if (!images?.length) return null;
  let best = images[0];
  for (const img of images) if ((img.width ?? 0) > (best.width ?? 0)) best = img;
  return best.url || null;
}

function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function isTicketmasterIngestEnabled(): boolean {
  const raw = process.env.ENABLE_TICKETMASTER_INGEST;
  if (!raw || !raw.trim()) return true;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function toBatchFailure(batch: number, rows: number, error: unknown): BatchFailure {
  const fallbackMessage = error instanceof Error ? error.message : String(error);
  const e = error as { message?: string; code?: string; details?: string; hint?: string } | null;
  return {
    batch,
    rows,
    message: e?.message ?? fallbackMessage,
    code: e?.code ?? null,
    details: e?.details ?? null,
    hint: e?.hint ?? null,
  };
}

async function userExists(supabase: any, userId: string): Promise<boolean> {
  if (!isUuid(userId)) return false;

  try {
    const { data, error } = await (supabase as any)
      .schema("auth")
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data?.id) return true;
  } catch (error) {
    console.warn("[Cron] Could not validate user via auth.users; falling back to profiles:", error);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) return false;
  return !!(profile as { user_id?: string } | null)?.user_id;
}

async function resolveCreatedByUserId(
  supabase: any,
  configuredUserId: string
): Promise<string> {
  if (await userExists(supabase, configuredUserId)) return configuredUserId;
  throw new Error(
    `SYSTEM_USER_ID is configured but invalid in auth.users/profiles: ${configuredUserId}.`
  );
}

function resolveStart(dates?: TmEvent["dates"]): string | null {
  if (dates?.start?.dateTime) return new Date(dates.start.dateTime).toISOString();
  if (dates?.start?.localDate) return new Date(dates.start.localDate + "T00:00:00Z").toISOString();
  return null;
}

function resolveEnd(dates?: TmEvent["dates"], fallback?: string): string | null {
  if (dates?.end?.dateTime) return new Date(dates.end.dateTime).toISOString();
  if (dates?.end?.localDate) return new Date(dates.end.localDate + "T23:59:59Z").toISOString();
  return fallback ?? null;
}

function buildDescription(event: TmEvent): string | null {
  if (event.info?.trim()) return event.info.trim();
  if (event.description?.trim()) return event.description.trim();
  const parts: string[] = [];
  const cls = event.classifications?.[0];
  if (cls) {
    const tags = [cls.segment?.name, cls.genre?.name, cls.subGenre?.name].filter(
      (t): t is string => !!t && t !== "Undefined" && t !== "Other"
    );
    if (tags.length) parts.push(tags.join(" \u00b7 "));
  }
  const venue = event._embedded?.venues?.[0];
  if (venue?.name) parts.push(`at ${venue.name}`);
  return parts.length > 0 ? parts.join(" \u2014 ") : null;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchEventsForCity(apiKey: string, city: string, start: string, end: string): Promise<TmEvent[]> {
  const all: TmEvent[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < 10) {
    const url = new URL(TM_BASE);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("countryCode", "ZA");
    url.searchParams.set("city", city);
    url.searchParams.set("sort", "date,asc");
    url.searchParams.set("size", String(PAGE_SIZE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("startDateTime", start);
    url.searchParams.set("endDateTime", end);

    const res = await fetch(url.toString());
    if (res.status === 429) { await sleep(5000); continue; }
    if (!res.ok) throw new Error(`TM API ${res.status}`);
    const data = (await res.json()) as TmResponse;
    all.push(...(data._embedded?.events ?? []));
    totalPages = data.page?.totalPages ?? 1;
    page++;
    if (page < totalPages) await sleep(500);
  }

  return all;
}

// ---------------------------------------------------------------------------
// Map + consolidate
// ---------------------------------------------------------------------------

function mapEvent(event: TmEvent, bizId: string, userId: string): EventRow | null {
  const title = event.name?.trim() || "Untitled event";
  const startDate = resolveStart(event.dates);
  if (!startDate) return null;
  const venue = event._embedded?.venues?.[0];

  return {
    title,
    type: "event",
    business_id: bizId,
    created_by: userId,
    start_date: startDate,
    end_date: resolveEnd(event.dates, startDate),
    location: buildLocation(venue?.name, venue?.city?.name, venue?.country?.name),
    description: buildDescription(event),
    icon: "ticketmaster",
    image: pickBestImage(event.images),
    price: null,
    rating: 0,
    booking_url: event.url ?? null,
    booking_contact: null,
    availability_status: ['offsale', 'cancelled'].includes(event.dates?.status?.code ?? '') ? 'sold_out' : null,
  };
}

function consolidate(rows: EventRow[]): EventRow[] {
  const map = new Map<string, EventRow>();
  for (const row of rows) {
    const key = buildDedupeKey(row.title, row.start_date, row.location);
    const existing = map.get(key);
    if (!existing) { map.set(key, { ...row }); continue; }
    if (new Date(row.start_date) < new Date(existing.start_date)) existing.start_date = row.start_date;
    if (row.end_date && existing.end_date && new Date(row.end_date) > new Date(existing.end_date)) existing.end_date = row.end_date;
    else if (row.end_date && !existing.end_date) existing.end_date = row.end_date;
    if (row.description && (!existing.description || row.description.length > existing.description.length)) existing.description = row.description;
    if (row.image && !existing.image) existing.image = row.image;
    if (row.booking_url && !existing.booking_url) existing.booking_url = row.booking_url;
  }
  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!isTicketmasterIngestEnabled()) {
      console.warn("[Cron] Ticketmaster ingest skipped: ENABLE_TICKETMASTER_INGEST is not enabled.");
      return NextResponse.json({
        source: "ticketmaster",
        disabled: true,
        message: "Ticketmaster ingest disabled via ENABLE_TICKETMASTER_INGEST",
        fetched: 0,
        mapped: 0,
        consolidated: 0,
        inserted: 0,
        updated: 0,
        failed: 0,
      });
    }

    const apiKey = process.env.TICKETMASTER_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bizId = process.env.SYSTEM_BUSINESS_ID;
    const configuredUserId = process.env.SYSTEM_USER_ID;

    if (!apiKey || !supabaseUrl || !serviceKey || !bizId || !configuredUserId) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const createdByUserId = await resolveCreatedByUserId(supabase, configuredUserId);
    console.log(`[Cron] Using created_by user id: ${createdByUserId}`);

    // 1. Cleanup expired events
    const cutoff = new Date(Date.now() - 1 * 86_400_000).toISOString();
    await supabase
      .from("events_and_specials")
      .delete()
      .eq("icon", "ticketmaster")
      .eq("type", "event")
      .lt("end_date", cutoff);

    await supabase
      .from("events_and_specials")
      .delete()
      .eq("icon", "ticketmaster")
      .eq("type", "event")
      .is("end_date", null)
      .lt("start_date", cutoff);

    // 2. Fetch
    const now = new Date();
    const endWindow = new Date(now.getTime() + FETCH_WINDOW_DAYS * 86_400_000);
    const startDt = formatIsoNoMs(now);
    const endDt = formatIsoNoMs(endWindow);

    const allEvents: TmEvent[] = [];
    for (const city of CITIES) {
      const events = await fetchEventsForCity(apiKey, city, startDt, endDt);
      allEvents.push(...events);
      if (CITIES.indexOf(city) < CITIES.length - 1) await sleep(1000);
    }

    // 3. Map + consolidate
    const mapped = allEvents
      .map((e) => mapEvent(e, bizId, createdByUserId))
      .filter((r): r is EventRow => r !== null);
    const rows = consolidate(mapped);

    // 4. Upsert
    let inserted = 0;
    let updated = 0;
    const batchFailures: BatchFailure[] = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const { data, error } = await supabase.rpc("upsert_events_and_specials_consolidated", {
        p_rows: batch,
      });
      if (error) {
        const failure = toBatchFailure(batchNum, batch.length, error);
        batchFailures.push(failure);
        console.error("[Cron] Ticketmaster upsert batch failed:", failure);
        continue;
      }
      const first = Array.isArray(data) ? data[0] : data;
      inserted += Number(first?.inserted ?? 0);
      updated += Number(first?.updated ?? 0);
    }

    const failed = Math.max(0, rows.length - inserted - updated);
    const result = {
      source: "ticketmaster",
      created_by: createdByUserId,
      fetched: allEvents.length,
      mapped: mapped.length,
      consolidated: rows.length,
      inserted,
      updated,
      failed,
    };

    if (batchFailures.length > 0) {
      const failureResult = {
        ...result,
        error: "Ticketmaster upsert failed",
        batch_failures: batchFailures,
      };
      console.error("[Cron] Ticketmaster ingest failed during upsert:", failureResult);
      return NextResponse.json(failureResult, { status: 500 });
    }

    console.log("[Cron] Ticketmaster ingest complete:", result);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[Cron] Ticketmaster ingest failed:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
