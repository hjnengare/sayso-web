import { buildWhatsAppDeepLink, resolveCtaTarget } from "@/app/lib/events/cta";
import type { Event } from "@/app/lib/types/Event";

describe("events CTA smoke behavior", () => {
  it("builds WhatsApp deep link with encoded default event message", () => {
    const event: Event = {
      id: "event-1",
      title: "Friday Networking Session",
      type: "event",
      location: "Cape Town",
      startDate: "Mar 20",
      startDateISO: "2026-03-20T18:00:00.000Z",
      ctaSource: "whatsapp",
      whatsappNumber: "27721234567",
    };

    const resolved = resolveCtaTarget({
      event,
      currentUrl: "https://sayso.app/event/event-1",
      ctaSource: event.ctaSource,
      bookingUrl: null,
      whatsappNumber: event.whatsappNumber,
    });

    expect(resolved.ctaKind).toBe("whatsapp");
    expect(resolved.url).toContain("https://wa.me/27721234567?text=");
    expect(decodeURIComponent(String(resolved.url).split("text=")[1])).toContain(
      "I'd like to book for Friday Networking Session on Mar 20, 2026.",
    );
  });

  it("uses custom template interpolation for special WhatsApp message", () => {
    const special: Event = {
      id: "special-1",
      title: "2-for-1 Brunch",
      type: "special",
      location: "Pretoria",
      startDate: "Mar 10",
      startDateISO: "2026-03-10T08:00:00.000Z",
      endDate: "Mar 31",
      endDateISO: "2026-03-31T17:00:00.000Z",
      ctaSource: "whatsapp",
      whatsappNumber: "27720000000",
      whatsappPrefillTemplate: "Hi! {title} valid until {end_date}. See {public_url}",
    };

    const resolved = resolveCtaTarget({
      event: special,
      currentUrl: "https://sayso.app/special/special-1",
      ctaSource: special.ctaSource,
      bookingUrl: null,
      whatsappNumber: special.whatsappNumber,
      whatsappPrefillTemplate: special.whatsappPrefillTemplate,
    });

    expect(resolved.ctaKind).toBe("whatsapp");
    const decoded = decodeURIComponent(String(resolved.url).split("text=")[1]);
    expect(decoded).toContain("Hi! 2-for-1 Brunch valid until Mar 31, 2026.");
    expect(decoded).toContain("https://sayso.app/special/special-1");
  });

  it("falls back to normal external URL when WhatsApp is not selected", () => {
    const event: Event = {
      id: "event-2",
      title: "Open Mic",
      type: "event",
      location: "Johannesburg",
      startDate: "Apr 02",
      startDateISO: "2026-04-02T19:00:00.000Z",
      ctaSource: "website",
      bookingUrl: "https://example.com/open-mic",
    };

    const resolved = resolveCtaTarget({
      event,
      currentUrl: "https://sayso.app/event/event-2",
      ctaSource: event.ctaSource,
      bookingUrl: event.bookingUrl,
      whatsappNumber: null,
    });

    expect(resolved.ctaKind).toBe("external_url");
    expect(resolved.url).toBe("https://example.com/open-mic");
  });

  it("buildWhatsAppDeepLink encodes text safely", () => {
    const link = buildWhatsAppDeepLink({
      number: "27720000000",
      message: "Hello & welcome!",
    });

    expect(link).toBe("https://wa.me/27720000000?text=Hello%20%26%20welcome!");
  });
});
