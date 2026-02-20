import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { formatDateRangeLabel, mapEventsAndSpecialsRowToEventCard, type EventsAndSpecialsRow } from "@/app/lib/events/mapEvent";
import { createEventOrSpecial } from "@/app/lib/events/createEventSpecial";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RAW_ROWS = 4000;
const BOOKING_SELECT_FRAGMENT =
  ",booking_url,booking_contact,cta_source,whatsapp_number,whatsapp_prefill_template";
const FETCH_TIMEOUT_MS = 1500;
const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=300";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}

/**
 * Strip numbering, date tokens, and noise from a title to produce a canonical series key.
 * "Weekend Play Session 3 - 15 Feb" and "Weekend Play Session 1 - 8 Feb" → same key.
 */
const STRIP_PATTERNS = [
  /\s*[-–—:]\s*\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*(?:\s+\d{2,4})?/gi,
  /\s*\(?\b(?:day|part|session|week|round|set|show|edition|no\.?|number)\s*#?\d+\b\)?/gi,
  /\s*#\d+/g,
  /\s+\d{1,2}(?:st|nd|rd|th)?$/i,
  /\s*[-–—]\s*(?:mon|tue|wed|thu|fri|sat|sun)\w*(?:\s+\d{1,2})?/gi,
  /\s*\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\s*\d{1,2}:\d{2}(?:\s*(?:am|pm))?/gi,
  /\s*\|\s*\d+$/,
  /\s*\(\d+(?:\s*of\s*\d+)?\)/g,
];

const normalizeSeriesKey = (row: Pick<EventsAndSpecialsRow, "title" | "business_id" | "location">) => {
  let title = (row.title ?? "").toString().trim().toLowerCase();

  for (const pattern of STRIP_PATTERNS) {
    title = title.replace(pattern, "");
  }

  title = title.replace(/\s+/g, " ").replace(/[-–—:,.\s]+$/, "").trim();

  const business = (row.business_id ?? "").toString().trim().toLowerCase();
  const location = (row.location ?? "").toString().trim().toLowerCase();
  return `${title}|${business}|${location}`;
};

/**
 * GET /api/events-and-specials
 * List upcoming items from public.events_and_specials, consolidated into "series cards".
 *
 * Query params:
 * - type?: event | special
 * - city?: ignored (schema doesn't include city)
 * - limit?: number (default 20)
 */
export async function GET(req: NextRequest) {
  const reqStart = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = (searchParams.get("type") || "").trim().toLowerCase();
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const offsetParam = parseInt(searchParams.get("offset") || "0", 10); // internal pagination

    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

    const type = typeParam === "event" || typeParam === "special" ? (typeParam as "event" | "special") : null;

    // Search param: applied as ILIKE across title, location, description
    const searchParam = (searchParams.get("search") || "").trim().slice(0, 200);
    // Escape ILIKE wildcards in user input so they're treated as literals
    const ilikePat = searchParam.replace(/%/g, "\\%").replace(/_/g, "\\_");

    const supabase = await getServerSupabase(req);

    // SAST-aware cutoff: midnight today in UTC+2
    const nowUtc = new Date();
    const sastMidnight = new Date(nowUtc);
    sastMidnight.setUTCHours(sastMidnight.getUTCHours() + 2);
    sastMidnight.setUTCHours(0, 0, 0, 0);
    sastMidnight.setUTCHours(sastMidnight.getUTCHours() - 2);
    const bufferStart = sastMidnight.toISOString();

    const baseSelect =
      "id,title,type,business_id,start_date,end_date,location,description,icon,image,price,rating";

    let query = supabase
      .from("events_and_specials")
      .select(baseSelect + BOOKING_SELECT_FRAGMENT)
      // Include items still active via end_date (multi-day) even if start_date is earlier.
      .or(`end_date.gte.${bufferStart},and(end_date.is.null,start_date.gte.${bufferStart})`)
      .order("start_date", { ascending: true })
      .limit(MAX_RAW_ROWS);

    if (type) {
      query = query.eq("type", type);
    }

    if (ilikePat) {
      query = query.or(
        `title.ilike.%${ilikePat}%,location.ilike.%${ilikePat}%,description.ilike.%${ilikePat}%`
      );
    }

    let data: any[] | null = null;
    let error: any = null;

    ({ data, error } = await withTimeout(query, FETCH_TIMEOUT_MS, "events-and-specials:primary"));

    const errorMessage = String(error?.message ?? "");
    const isMissingCtaOrBookingColumn =
      error &&
      /does not exist/i.test(errorMessage) &&
      /(events_and_specials\.)?(booking_url|cta_source|whatsapp_number|whatsapp_prefill_template)/i.test(errorMessage);

    if (isMissingCtaOrBookingColumn) {
      console.warn("[events-and-specials] booking/cta columns missing; retrying without optional fields.");
      let retryQuery = supabase
        .from("events_and_specials")
        .select(baseSelect)
        .or(`end_date.gte.${bufferStart},and(end_date.is.null,start_date.gte.${bufferStart})`)
        .order("start_date", { ascending: true })
        .limit(MAX_RAW_ROWS);

      if (type) {
        retryQuery = retryQuery.eq("type", type);
      }

      if (ilikePat) {
        retryQuery = retryQuery.or(
          `title.ilike.%${ilikePat}%,location.ilike.%${ilikePat}%,description.ilike.%${ilikePat}%`
        );
      }

      ({ data, error } = await withTimeout(
        retryQuery,
        FETCH_TIMEOUT_MS,
        "events-and-specials:retry-no-cta"
      ));
    }

    if (error) {
      console.error("[events-and-specials] query error:", error);
      const response = NextResponse.json({ items: [], count: 0, limit, offset }, { status: 200 });
      response.headers.set("Cache-Control", CACHE_CONTROL);
      response.headers.set("X-Query-Duration-MS", String(Date.now() - reqStart));
      return response;
    }

    const rawRows = (data || []) as unknown as EventsAndSpecialsRow[];

    // Fetch business visibility status for events with business_id
    // Events linked to hidden/system businesses should still appear,
    // but without business attribution
    const businessIds = [...new Set(rawRows.map(r => r.business_id).filter(Boolean))];
    const hiddenOrSystemBusinessIds = new Set<string>();
    
    if (businessIds.length > 0) {
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, is_hidden, is_system, name')
        .in('id', businessIds);
      
      for (const biz of businessData || []) {
        if (biz.is_hidden === true || biz.is_system === true || biz.name === 'Sayso System') {
          hiddenOrSystemBusinessIds.add(biz.id);
        }
      }
    }
    
    // Clear business_id for events linked to hidden/system businesses
    const processedRows = rawRows.map(row => {
      if (row.business_id && hiddenOrSystemBusinessIds.has(row.business_id)) {
        return { ...row, business_id: null, _isExternalEvent: true };
      }
      return row;
    }) as (EventsAndSpecialsRow & { _isExternalEvent?: boolean })[];

    // Consolidate into series cards.
    const series = new Map<
      string,
      {
        representative: EventsAndSpecialsRow & { _isExternalEvent?: boolean };
        occurrences: number;
        minStart: string;
        maxEnd: string;
        startDates: string[];
        isExternalEvent: boolean;
        firstNonNull: {
          image: string | null;
          icon: string | null;
          description: string | null;
          booking_url: string | null;
          booking_contact: string | null;
          cta_source: string | null;
          whatsapp_number: string | null;
          whatsapp_prefill_template: string | null;
          price: number | null;
          rating: number | null;
        };
      }
    >();

    for (const row of processedRows) {
      const key = normalizeSeriesKey(row);
      const start = row.start_date;
      const end = row.end_date ?? row.start_date;

      const existing = series.get(key);
      if (!existing) {
        series.set(key, {
          representative: row,
          occurrences: 1,
          minStart: start,
          maxEnd: end,
          startDates: [start],
          isExternalEvent: !!(row as any)._isExternalEvent,
          firstNonNull: {
            image: row.image ?? null,
            icon: row.icon ?? null,
            description: row.description ?? null,
            booking_url: (row as any).booking_url ?? null,
            booking_contact: (row as any).booking_contact ?? null,
            cta_source: (row as any).cta_source ?? null,
            whatsapp_number: (row as any).whatsapp_number ?? null,
            whatsapp_prefill_template: (row as any).whatsapp_prefill_template ?? null,
            price: row.price ?? null,
            rating: row.rating ?? null,
          },
        });
        continue;
      }

      existing.occurrences += 1;
      existing.startDates.push(start);

      if (new Date(start).getTime() < new Date(existing.minStart).getTime()) {
        existing.minStart = start;
        // keep representative stable by MIN(id) below, not by date
      }
      if (new Date(end).getTime() > new Date(existing.maxEnd).getTime()) {
        existing.maxEnd = end;
      }

      // Stable representative id: MIN(id)
      if (String(row.id).localeCompare(String(existing.representative.id)) < 0) {
        existing.representative = row;
      }

      if (!existing.firstNonNull.image && row.image) existing.firstNonNull.image = row.image;
      if (!existing.firstNonNull.icon && row.icon) existing.firstNonNull.icon = row.icon;
      if (!existing.firstNonNull.description && row.description) existing.firstNonNull.description = row.description;
      if (!existing.firstNonNull.booking_url && (row as any).booking_url) existing.firstNonNull.booking_url = (row as any).booking_url;
      if (!existing.firstNonNull.booking_contact && (row as any).booking_contact) existing.firstNonNull.booking_contact = (row as any).booking_contact;
      if (!existing.firstNonNull.cta_source && (row as any).cta_source) existing.firstNonNull.cta_source = (row as any).cta_source;
      if (!existing.firstNonNull.whatsapp_number && (row as any).whatsapp_number) existing.firstNonNull.whatsapp_number = (row as any).whatsapp_number;
      if (!existing.firstNonNull.whatsapp_prefill_template && (row as any).whatsapp_prefill_template) existing.firstNonNull.whatsapp_prefill_template = (row as any).whatsapp_prefill_template;
      if (existing.firstNonNull.price == null && row.price != null) existing.firstNonNull.price = row.price;
      if (existing.firstNonNull.rating == null && row.rating != null) existing.firstNonNull.rating = row.rating;
    }

    const consolidated = Array.from(series.values())
      .map((s) => {
        const representative: EventsAndSpecialsRow = {
          ...s.representative,
          start_date: s.minStart,
          end_date: s.maxEnd === s.minStart ? null : s.maxEnd,
          image: s.firstNonNull.image,
          icon: s.firstNonNull.icon,
          description: s.firstNonNull.description,
          price: s.firstNonNull.price,
          rating: s.firstNonNull.rating,
          booking_url: s.firstNonNull.booking_url,
          booking_contact: s.firstNonNull.booking_contact,
          cta_source: s.firstNonNull.cta_source as any,
          whatsapp_number: s.firstNonNull.whatsapp_number,
          whatsapp_prefill_template: s.firstNonNull.whatsapp_prefill_template,
        };

        const dateRangeLabel =
          s.occurrences > 1 ? formatDateRangeLabel(s.minStart, s.maxEnd) : null;

        return mapEventsAndSpecialsRowToEventCard(representative, {
          occurrencesCount: s.occurrences,
          dateRangeLabel,
          startDates: s.startDates.slice().sort(),
          isExternalEvent: s.isExternalEvent,
        });
      })
      .sort((a, b) => new Date(a.startDateISO || a.startDate).getTime() - new Date(b.startDateISO || b.startDate).getTime());

    // When a search query is active return all consolidated matches (client handles display).
    // For normal browsing, apply server-side pagination.
    const paged = searchParam ? consolidated : consolidated.slice(offset, offset + limit);

    const response = NextResponse.json({
      items: paged,
      count: consolidated.length,
      limit,
      offset,
    });
    response.headers.set("Cache-Control", CACHE_CONTROL);
    response.headers.set("X-Query-Duration-MS", String(Date.now() - reqStart));
    return response;
  } catch (err) {
    console.error("[events-and-specials] error:", err);
    const response = NextResponse.json({ items: [], count: 0, limit: 20, offset: 0 }, { status: 200 });
    response.headers.set("Cache-Control", CACHE_CONTROL);
    response.headers.set("X-Query-Duration-MS", String(Date.now() - reqStart));
    return response;
  }
}

/**
 * POST /api/events-and-specials
 * Create event/special with centralized permission checks.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const result = await createEventOrSpecial({
      supabase,
      userId: user.id,
      body,
    });

    if (result.ok === false) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error: any) {
    console.error("[events-and-specials] create error:", error);
    return NextResponse.json(
      { error: "Failed to create listing", details: error?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
