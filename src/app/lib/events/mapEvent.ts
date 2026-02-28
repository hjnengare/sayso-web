import type { Event } from "../types/Event";

const EN_DASH = "–";

const formatIsoToCardDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const formatDateRangeLabel = (startIso?: string | null, endIso?: string | null) => {
  if (!startIso || !endIso) return null;
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) return null;

  const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  const dayFmt = new Intl.DateTimeFormat("en-US", { day: "numeric" });
  const monFmt = new Intl.DateTimeFormat("en-US", { month: "short" });

  if (sameMonth) {
    return `${dayFmt.format(s)}${EN_DASH}${dayFmt.format(e)} ${monFmt.format(s)}`;
  }
  return `${dayFmt.format(s)} ${monFmt.format(s)}${EN_DASH}${dayFmt.format(e)} ${monFmt.format(e)}`;
};

export type EventsAndSpecialsRow = {
  id: string;
  title: string;
  type: "event" | "special";
  business_id: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  icon: string | null;
  image: string | null;
  price: number | null;
  rating: number | null;
  booking_url?: string | null;
  booking_contact?: string | null;
  cta_source?: "website" | "whatsapp" | "quicket" | "webtickets" | "other" | null;
  whatsapp_number?: string | null;
  whatsapp_prefill_template?: string | null;
  availability_status?: 'sold_out' | 'limited' | null;
};

export function mapEventsAndSpecialsRowToEventCard(
  row: EventsAndSpecialsRow,
  opts?: { occurrencesCount?: number; dateRangeLabel?: string | null; startDates?: string[]; isExternalEvent?: boolean }
): Event & { occurrencesCount?: number; date_range_label?: string | null; isExternalEvent?: boolean } {
  const startIso = row.start_date;
  const endIso = row.end_date;

  const occurrencesCount = opts?.occurrencesCount;
  const computedRange =
    occurrencesCount && occurrencesCount > 1
      ? opts?.dateRangeLabel ?? formatDateRangeLabel(startIso, endIso || startIso)
      : null;

  const bookingUrl = row.booking_url ?? null;
  const occurrencesArray =
    Array.isArray(opts?.startDates) && opts!.startDates!.length > 0
      ? opts!.startDates!.map((d) => ({ startDate: d, endDate: undefined, bookingUrl: bookingUrl || undefined }))
      : [{ startDate: startIso, endDate: endIso || undefined, bookingUrl: bookingUrl || undefined }];

  // Parse composite location "venue • city • country" into separate fields
  let venueName: string | undefined;
  let city: string | undefined;
  let country: string | undefined;
  const locationStr = row.location ?? "";
  if (locationStr.includes(" \u2022 ")) {
    const parts = locationStr.split(" \u2022 ").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      venueName = parts[0];
      city = parts[1];
      if (parts.length >= 3) country = parts[2];
    }
  }

  // Fix protocol-relative URLs from legacy DB entries
  const fixedImage = row.image
    ? row.image.startsWith("//") ? `https:${row.image}` : row.image
    : null;

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    image: fixedImage,
    alt: `${row.title} ${row.type}`,
    icon: row.icon ?? undefined,
    location: row.location ?? "Location TBD",
    rating: row.rating ?? 0,
    startDate: formatIsoToCardDate(startIso) || "",
    endDate: endIso ? formatIsoToCardDate(endIso) : undefined,
    startDateISO: startIso,
    endDateISO: endIso ?? undefined,
    price: row.price != null ? `R${row.price}` : null,
    description: row.description ?? undefined,
    bookingUrl: bookingUrl || undefined,
    bookingContact: (row.booking_contact ?? undefined) as any,
    ctaSource: row.cta_source ?? null,
    whatsappNumber: row.whatsapp_number ?? undefined,
    whatsappPrefillTemplate: row.whatsapp_prefill_template ?? undefined,
    businessId: opts?.isExternalEvent ? undefined : (row.business_id ?? undefined),
    isCommunityEvent: row.type === "event" ? (row.business_id == null || opts?.isExternalEvent) : false,
    isExternalEvent: opts?.isExternalEvent || false,
    venueName,
    city,
    country,
    occurrences: occurrencesArray,
    ...(occurrencesCount != null ? { occurrencesCount } : null),
    ...(computedRange ? { date_range_label: computedRange } : null),
    href: row.type === "event" ? `/event/${row.id}` : `/special/${row.id}`,
    source: "business",
    availabilityStatus: row.availability_status ?? null,
  };
}
