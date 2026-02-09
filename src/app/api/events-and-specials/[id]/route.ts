import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { mapEventsAndSpecialsRowToEventCard, type EventsAndSpecialsRow } from "@/app/lib/events/mapEvent";

export const dynamic = "force-dynamic";

const normalize = (value: string | null | undefined) => (value ?? "").toString().trim().toLowerCase();

const buildSeriesKey = (row: Pick<EventsAndSpecialsRow, "title" | "business_id" | "location">) =>
  `${normalize(row.title)}|${normalize(row.business_id)}|${normalize(row.location)}`;

/**
 * GET /api/events-and-specials/[id]
 * Fetch representative row + occurrences list using the same series-key grouping.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const supabase = await getServerSupabase(req);

    // 1) Representative row by id
    const baseSelect =
      "id,title,type,business_id,start_date,end_date,location,description,icon,image,price,rating,created_by,created_at,updated_at";

    let representative: any = null;
    let repError: any = null;

    ({ data: representative, error: repError } = await supabase
      .from("events_and_specials")
      .select(baseSelect + ",booking_url,booking_contact")
      .eq("id", id)
      .single());

    const repErrorMessage = String(repError?.message ?? "");
    const isMissingBookingColumn =
      repError &&
      /does not exist/i.test(repErrorMessage) &&
      /(events_and_specials\.)?booking_url/i.test(repErrorMessage);

    if (isMissingBookingColumn) {
      console.warn("[events-and-specials/[id]] booking_url missing; retrying without booking fields.");
      ({ data: representative, error: repError } = await supabase
        .from("events_and_specials")
        .select(baseSelect)
        .eq("id", id)
        .single());
    }

    if (repError) {
      if (repError.code === "PGRST116") {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
      console.error("[events-and-specials/[id]] rep error:", repError);
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const repRow = representative as unknown as EventsAndSpecialsRow;
    const seriesKey = buildSeriesKey(repRow);

    // Optional business enrichment (used by the special detail page)
    if (repRow.business_id) {
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id,name,slug,image_url,address,phone,website,email")
        .eq("id", repRow.business_id)
        .maybeSingle();

      if (businessError) {
        console.warn("[events-and-specials/[id]] businesses fetch error:", businessError);
      } else if (business) {
        (repRow as any).businessName = business.name ?? undefined;
        (repRow as any).businessSlug = business.slug ?? undefined;
        (repRow as any).businessLogo = (business as any).image_url ?? undefined;
        (repRow as any).businessAddress = (business as any).address ?? undefined;
        (repRow as any).businessPhone = (business as any).phone ?? undefined;
        (repRow as any).businessWebsite = (business as any).website ?? undefined;
        (repRow as any).businessEmail = (business as any).email ?? undefined;
      }
    }

    // 2) Fetch all occurrences for this series (narrow by business_id + type first, then normalize filter in JS)
    let occQuery = supabase
      .from("events_and_specials")
      .select("id,title,type,business_id,start_date,end_date,location,booking_url,booking_contact")
      .eq("type", repRow.type)
      .order("start_date", { ascending: true })
      .limit(2000);

    if (repRow.business_id) {
      occQuery = occQuery.eq("business_id", repRow.business_id);
    } else {
      occQuery = occQuery.is("business_id", null);
    }

    // Use ilike to avoid missing occurrences due to casing differences; final match is via normalized key.
    occQuery = occQuery.ilike("title", repRow.title);
    if (repRow.location) {
      occQuery = occQuery.ilike("location", repRow.location);
    }

    let occCandidates: any[] | null = null;
    let occError: any = null;

    ({ data: occCandidates, error: occError } = await occQuery);

    const occErrorMessage = String(occError?.message ?? "");
    const occMissingBooking =
      occError &&
      /does not exist/i.test(occErrorMessage) &&
      /(events_and_specials\.)?booking_url/i.test(occErrorMessage);

    if (occMissingBooking) {
      console.warn("[events-and-specials/[id]] booking_url missing; retrying occurrences without booking fields.");

      let occRetry = supabase
        .from("events_and_specials")
        .select("id,title,type,business_id,start_date,end_date,location")
        .eq("type", repRow.type)
        .order("start_date", { ascending: true })
        .limit(2000);

      if (repRow.business_id) {
        occRetry = occRetry.eq("business_id", repRow.business_id);
      } else {
        occRetry = occRetry.is("business_id", null);
      }

      occRetry = occRetry.ilike("title", repRow.title);
      if (repRow.location) {
        occRetry = occRetry.ilike("location", repRow.location);
      }

      ({ data: occCandidates, error: occError } = await occRetry);
    }

    if (occError) {
      console.error("[events-and-specials/[id]] occurrences error:", occError);
    }

    const occurrencesRows = ((occCandidates || []) as unknown as EventsAndSpecialsRow[])
      .filter((r) => buildSeriesKey(r) === seriesKey)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const occurrences_list = occurrencesRows.map((r) => ({
      id: r.id,
      start_date: r.start_date,
      end_date: r.end_date ?? null,
      booking_url: (r as any).booking_url ?? null,
      booking_contact: (r as any).booking_contact ?? null,
      location: r.location ?? null,
    }));

    const startDates = occurrencesRows.map((r) => r.start_date);
    const earliest = startDates[0] ?? repRow.start_date;
    const latest =
      occurrencesRows.length > 0
        ? occurrencesRows
            .map((r) => r.end_date ?? r.start_date)
            .sort()
            .slice(-1)[0]
        : (repRow.end_date ?? repRow.start_date);

    const event = mapEventsAndSpecialsRowToEventCard(
      {
        ...repRow,
        start_date: earliest,
        end_date: latest === earliest ? null : latest,
      },
      {
        occurrencesCount: occurrencesRows.length || 1,
        startDates: startDates.slice().sort(),
      },
    );

    // Pass through optional business metadata if present
    const businessMeta = {
      businessName: (repRow as any).businessName as string | undefined,
      businessSlug: (repRow as any).businessSlug as string | undefined,
      businessLogo: (repRow as any).businessLogo as string | undefined,
      businessAddress: (repRow as any).businessAddress as string | undefined,
      businessPhone: (repRow as any).businessPhone as string | undefined,
      businessWebsite: (repRow as any).businessWebsite as string | undefined,
      businessEmail: (repRow as any).businessEmail as string | undefined,
    };
    Object.entries(businessMeta).forEach(([k, v]) => {
      if (v) (event as any)[k] = v;
    });

    return NextResponse.json({
      event,
      occurrences_list,
      occurrences: occurrencesRows.length || 1,
    });
  } catch (err) {
    console.error("[events-and-specials/[id]] error:", err);
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
}
