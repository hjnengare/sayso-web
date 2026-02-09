import type { Event } from "@/app/lib/types/Event";

export type CtaSource = "website" | "whatsapp" | "quicket" | "webtickets" | "other";
export type CtaKind = "external_url" | "whatsapp";

const WHATSAPP_HOSTS = ["wa.me", "api.whatsapp.com", "www.whatsapp.com", "whatsapp.com"];

function parseMaybeDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function normalizeCtaSource(value: string | null | undefined): CtaSource | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "website" ||
    normalized === "whatsapp" ||
    normalized === "quicket" ||
    normalized === "webtickets" ||
    normalized === "other"
  ) {
    return normalized;
  }
  return null;
}

export function normalizeWhatsAppNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 7 ? digits : null;
}

export function isWhatsAppUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return WHATSAPP_HOSTS.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function extractWhatsAppNumberFromUrl(value: string | null | undefined): string | null {
  if (!value || !isWhatsAppUrl(value)) return null;
  try {
    const parsed = new URL(value);
    const pathname = parsed.pathname.replace(/^\/+/, "");
    if (pathname) {
      const fromPath = normalizeWhatsAppNumber(pathname.split("/")[0] || "");
      if (fromPath) return fromPath;
    }
    const queryPhone = parsed.searchParams.get("phone");
    return normalizeWhatsAppNumber(queryPhone);
  } catch {
    return null;
  }
}

function formatDateLine(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function interpolateTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(title|start_date|end_date|public_url|qty)\}/gi, (_match, token) => {
    const key = String(token).toLowerCase();
    return values[key] ?? "";
  });
}

export function buildWhatsAppMessage(params: {
  event: Event;
  publicUrl: string;
  template?: string | null;
}): string {
  const { event, publicUrl, template } = params;
  const start = formatDateLine(parseMaybeDate(event.startDateISO || event.startDate));
  const end = formatDateLine(parseMaybeDate(event.endDateISO || event.endDate));
  const values = {
    title: event.title || "this listing",
    start_date: start || "",
    end_date: end || "N/A",
    public_url: publicUrl,
    qty: "TBD",
  };

  if (template && template.trim()) {
    return interpolateTemplate(template.trim(), values).replace(/\n{3,}/g, "\n\n").trim();
  }

  if (event.type === "special") {
    return [
      `Hi! I'd like to redeem / reserve the special: ${values.title}.`,
      `Valid until: ${values.end_date || "N/A"}`,
      `Here's the Sayso link: ${values.public_url}`,
    ].join("\n");
  }

  const firstLine = start
    ? `Hi! I'd like to book for ${values.title} on ${values.start_date}.`
    : `Hi! I'd like to book for ${values.title}.`;

  return [
    firstLine,
    `People: ${values.qty}`,
    `Here's the Sayso link: ${values.public_url}`,
  ].join("\n");
}

export function buildWhatsAppDeepLink(params: { number: string; message: string }): string {
  const encoded = encodeURIComponent(params.message);
  return `https://wa.me/${params.number}?text=${encoded}`;
}

export function resolveCtaTarget(params: {
  event: Event;
  currentUrl: string;
  ctaSource?: string | null;
  bookingUrl?: string | null;
  whatsappNumber?: string | null;
  whatsappPrefillTemplate?: string | null;
}): { url: string | null; ctaKind: CtaKind; ctaSource: CtaSource | null } {
  const source = normalizeCtaSource(params.ctaSource);
  const bookingUrl = params.bookingUrl?.trim() || null;
  const explicitWhatsappNumber = normalizeWhatsAppNumber(params.whatsappNumber);
  const urlWhatsappNumber = extractWhatsAppNumberFromUrl(bookingUrl);
  const whatsappNumber = explicitWhatsappNumber || urlWhatsappNumber;
  const shouldUseWhatsapp = (source === "whatsapp" || isWhatsAppUrl(bookingUrl)) && Boolean(whatsappNumber);

  if (shouldUseWhatsapp && whatsappNumber) {
    const message = buildWhatsAppMessage({
      event: params.event,
      publicUrl: params.currentUrl,
      template: params.whatsappPrefillTemplate || null,
    });
    return {
      url: buildWhatsAppDeepLink({ number: whatsappNumber, message }),
      ctaKind: "whatsapp",
      ctaSource: "whatsapp",
    };
  }

  return {
    url: bookingUrl,
    ctaKind: "external_url",
    ctaSource: source,
  };
}
