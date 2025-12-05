// src/components/EventsSpecials/EventsSpecials.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "react-feather";
import EventCard from "../EventCard/EventCard";
import EventCardSkeleton from "../EventCard/EventCardSkeleton";
import { Event } from "../../data/eventsData";
import ScrollableSection from "../ScrollableSection/ScrollableSection";
import { useToast } from "../../contexts/ToastContext";

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

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[EventsSpecials] Render:', { 
      eventsCount: events?.length || 0, 
      loading, 
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

  if (loading) {
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

  // Show empty state if not loading and no events
  if (!loading && (!events || events.length === 0)) {
    // Return null to hide the section when there are no events
    // (Alternatively, you could show an empty state component here)
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
          <h2
            className="text-h2 sm:text-h1 font-bold text-charcoal hover:text-sage transition-all duration-300 px-3 sm:px-4 py-1 hover:bg-sage/5 rounded-lg cursor-default"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {title}
          </h2>

          <button
            onClick={() => router.push(href)}
            className="group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-all duration-300 hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative"
            aria-label={`${cta}: ${title}`}
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}
          >
            <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-0.5 text-charcoal group-hover:text-sage">
              {cta}
            </span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 text-charcoal group-hover:text-sage" />
          </button>
        </div>

        <div className="pt-2">
          {/* Mobile: Scrollable section with one card at a time */}
          <div className="md:hidden">
            <ScrollableSection>
              <div className="flex gap-3 items-stretch">
                {events.slice(0, 4).map((event) => (
                  <div key={event.id} className="snap-start snap-always flex-shrink-0 w-[100vw] list-none flex">
                    <EventCard event={event} onBookmark={handleBookmark} />
                  </div>
                ))}
              </div>
            </ScrollableSection>
          </div>
          
          {/* Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {events.slice(0, 4).map((event) => (
              <div key={event.id} className="list-none flex">
                <EventCard event={event} onBookmark={handleBookmark} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
