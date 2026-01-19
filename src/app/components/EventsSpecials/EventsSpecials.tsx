// src/components/EventsSpecials/EventsSpecials.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import EventCard from "../EventCard/EventCard";
import EventCardSkeleton from "../EventCard/EventCardSkeleton";
import { Event } from "../../data/eventsData";
import ScrollableSection from "../ScrollableSection/ScrollableSection";
import { useToast } from "../../contexts/ToastContext";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";
import { useState, useEffect } from "react";

const normalize = (value: string | undefined | null) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

const buildCanonicalKey = (event: Event) => event.canonicalKey || event.id || `${normalize(event.title)}|${normalize(event.location)}`;

const aggregateEvents = (events: Event[]): Event[] => {
  const map = new Map<string, Event & { occurrences?: Array<{ startDate: string; endDate?: string }>; startDateISO?: string; endDateISO?: string }>();

  for (const evt of events) {
    const key = buildCanonicalKey(evt);
    const startISO = evt.startDateISO || evt.startDate;
    const endISO = evt.endDateISO || evt.endDate;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...evt,
        canonicalKey: key,
        startDateISO: startISO,
        endDateISO: endISO,
        occurrences: evt.occurrences || [{ startDate: startISO, endDate: endISO }],
      });
      continue;
    }

    const occurrences = [...(existing.occurrences || []), ...(evt.occurrences || [{ startDate: startISO, endDate: endISO }])];
    const allStarts = occurrences.map((o) => o.startDate).filter(Boolean);
    const allEnds = occurrences.map((o) => o.endDate).filter(Boolean);
    const minStart = allStarts.length ? allStarts.slice().sort()[0] : existing.startDateISO;
    const maxEnd = allEnds.length ? allEnds.slice().sort()[allEnds.length - 1] : existing.endDateISO;

    map.set(key, {
      ...existing,
      occurrences,
      startDateISO: minStart,
      endDateISO: maxEnd,
      startDate: minStart || existing.startDate,
      endDate: maxEnd || existing.endDate,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const aDate = a.startDateISO ? new Date(a.startDateISO).getTime() : new Date(a.startDate).getTime();
    const bDate = b.startDateISO ? new Date(b.startDateISO).getTime() : new Date(b.startDate).getTime();
    return aDate - bDate;
  });
};

export default function EventsSpecials({
  title = "Events & Specials",
  events,
  cta = "See More",
  href = "/events-specials",
  loading = false,
}: {
  title?: string;
  events: Event[];
  cta?: string;
  href?: string;
  loading?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [businessEvents, setBusinessEvents] = useState<Event[]>([]);
  const [loadingBusinessEvents, setLoadingBusinessEvents] = useState(true);

  // Fetch business-owned events on mount
  useEffect(() => {
    const fetchBusinessEvents = async () => {
      try {
        setLoadingBusinessEvents(true);
        const res = await fetch('/api/events/business-events');
        if (!res.ok) {
          console.warn('[EventsSpecials] business-events returned non-200', res.status);
          setBusinessEvents([]);
          return;
        }
        const result = await res.json();
        setBusinessEvents(result.data || []);
      } catch (error) {
        console.error('Error fetching business events:', error);
        setBusinessEvents([]);
      } finally {
        setLoadingBusinessEvents(false);
      }
    };

    fetchBusinessEvents();
  }, []);

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[EventsSpecials] Render:', { 
      eventsCount: events?.length || 0,
      businessEventsCount: businessEvents?.length || 0,
      loading, 
      loadingBusinessEvents,
      hasEvents: events && events.length > 0 
    });
  }

  const handleBookmark = (event: Event) => {
    // In production, this would save to the backend
    // For now, show a toast notification
    showToast(
      `${event.title} has been saved to your favorites`,
      "success",
      3000
    );
  };

  if (loading || loadingBusinessEvents) {
    return (
      <section
        className="relative m-0 w-full"
        aria-label={title}
        style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <div className="mx-auto w-full max-w-[2000px] relative z-10 px-2">
          <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
            <div className="h-8 w-48 bg-charcoal/10 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-charcoal/10 rounded-full animate-pulse" />
          </div>

          <div className="pt-2">
            {/* Mobile: Scrollable section with skeleton */}
            <div className="md:hidden">
              <ScrollableSection>
                <div className="flex gap-3 items-stretch">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="snap-start snap-always flex-shrink-0 w-[100vw] list-none flex">
                      <EventCardSkeleton />
                    </div>
                  ))}
                </div>
              </ScrollableSection>
            </div>
            
            {/* Desktop: Grid layout with skeleton */}
            <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="list-none flex">
                  <EventCardSkeleton />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Merge business events with provided events, sorted by start date
  // Only use real data - no fallback to static events
  const displayEvents = aggregateEvents([
    ...(businessEvents || []),
    ...(events || []),
  ]).slice(0, 4); // Limit to first 4 events after consolidation

  // Only show if we have real events
  if (!loadingBusinessEvents && displayEvents.length === 0) {
    return null;
  }

  return (
    <section
      className="relative m-0 w-full"
      aria-label={title}
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <div className="mx-auto w-full max-w-[2000px] relative z-10 px-2">
        <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
          <WavyTypedTitle
            text={title}
            as="h2"
            className="font-urbanist text-h2 sm:text-h1 font-700 text-charcoal hover:text-sage transition-all duration-300 px-3 sm:px-4 py-1 hover:bg-sage/5 rounded-lg cursor-default"
            typingSpeedMs={40}
            startDelayMs={300}
            waveVariant="subtle"
            loopWave={true}
            enableScrollTrigger={true}
            disableWave={true}
            style={{ 
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontWeight: 700,
            }}
          />

          <button
            onClick={() => router.push(href)}
            className="group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-all duration-300 hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative"
            aria-label={`${cta}: ${title}`}
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
          >
            <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-0.5 text-charcoal group-hover:text-sage" style={{ fontWeight: 600 }}>
              {cta.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            </span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 text-charcoal group-hover:text-sage" />
          </button>
        </div>

        <div className="pt-2">
          {/* Mobile: Scrollable section with one card at a time */}
          <div className="md:hidden">
            <ScrollableSection>
              <div className="flex gap-3 items-stretch">
                {displayEvents.map((event, index) => (
                  <div key={event.id} className="snap-start snap-always flex-shrink-0 w-[100vw] list-none flex">
                    <EventCard event={event} onBookmark={handleBookmark} index={index} />
                  </div>
                ))}
              </div>
            </ScrollableSection>
          </div>
          
          {/* Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {displayEvents.map((event, index) => (
              <div key={event.id} className="list-none flex">
                <EventCard event={event} onBookmark={handleBookmark} index={index} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
