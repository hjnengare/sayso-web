import React, { useEffect, useMemo } from "react";
import { useBusinessEvents } from "../../hooks/useBusinessEvents";
import EventsSpecials from "../EventsSpecials/EventsSpecials";
import type { Event } from "../../lib/types/Event";

interface BusinessOwnedEventsSectionProps {
  businessId: string;
  businessName: string;
}

/**
 * Business Events & Specials rail
 * Mirrors Events & Specials design (EventCard/EventCardSkeleton) and SWR behavior
 * while preserving the existing return-null contract when there are no listings.
 */
export default function BusinessOwnedEventsSection({
  businessId,
  businessName,
}: BusinessOwnedEventsSectionProps) {
  const { events, loading, error, mutate } = useBusinessEvents(businessId);

  // Match /event/[id] visibility revalidation behavior without altering hook
  useEffect(() => {
    if (!mutate) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        mutate();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [mutate]);

  // Normalize to EventCard shape (keep key structure + formatting parity)
  const normalizedEvents = useMemo<Event[]>(() => {
    return (events || []).map((event) => ({
      ...event,
      price: event.price != null ? String(event.price) : null,
      startDateISO: event.startDate,
      endDateISO: event.endDate,
      businessName,
      isBusinessOwned: true,
    }));
  }, [events, businessName]);

  const hasEvents = normalizedEvents.length > 0;
  const showSkeleton = loading && !hasEvents;

  // Preserve legacy contract: hide section completely when no listings
  if (!loading && !hasEvents) {
    return null;
  }

  return (
    <section className="pt-8 border-t border-charcoal/10">
      {/* Partial-error banner mirrors /events-specials handling */}
      {error && hasEvents && (
        <div className="rounded-[16px] border border-charcoal/10 bg-off-white/70 backdrop-blur-md px-4 py-3 flex items-start justify-between gap-3 mb-4">
          <div className="text-sm text-charcoal/70">
            Some results may be missing: {error}
          </div>
          <button
            onClick={() => mutate?.()}
            className="shrink-0 mi-tap px-4 py-1.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition"
          >
            Retry
          </button>
        </div>
      )}

      <EventsSpecials
        title={`Events & Specials from ${businessName}`}
        events={normalizedEvents}
        cta="See More"
        href="/events-specials"
        loading={showSkeleton}
        premiumCtaHover
        hideCarouselArrowsOnDesktop
      />
    </section>
  );
}
