// src/components/EventsSpecials/EventsSpecials.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import EventCard from "../EventCard/EventCard";
import EventCardSkeleton from "../EventCard/EventCardSkeleton";
import type { Event } from "../../lib/types/Event";
import ScrollableSection from "../ScrollableSection/ScrollableSection";
import { m, useReducedMotion } from "framer-motion";
import FilterPillGroup from "../Filters/FilterPillGroup";
import { useMemo, useState } from "react";
import { useIsDesktop } from "../../hooks/useIsDesktop";
import WavyTypedTitle from "../Animations/WavyTypedTitle";

// Animation variants for staggered card appearance (matching badge page)
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

type ListingTypeFilter = "event" | "special" | null;

const normalizeEventKeyPart = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

const getStableEventRailKey = (event: Event): string => {
  if (event.id?.trim()) {
    return event.id;
  }

  return [
    normalizeEventKeyPart(event.type),
    normalizeEventKeyPart(event.title),
    normalizeEventKeyPart(event.startDateISO || event.startDate),
    normalizeEventKeyPart(event.endDateISO || event.endDate),
    normalizeEventKeyPart(event.location),
    normalizeEventKeyPart(event.businessId),
    normalizeEventKeyPart(event.href),
    normalizeEventKeyPart(event.canonicalKey),
  ].join("|");
};

export default function EventsSpecials({
  title = "Events & Specials",
  events,
  cta = "See More",
  href = "/events-specials",
  loading = false,
  titleFontWeight = 700,
  ctaFontWeight = 600,
  premiumCtaHover = false,
  disableAnimations = false,
  hideCarouselArrowsOnDesktop = false,
  fullBleed = false,
  enableMobilePeek = false,
  showHeaderCta = true,
  useTypedTitle = false,
  showTypeFilters = false,
  showAllTypeFilter = false,
  dateRibbonPosition = "corner",
  alignTitleWithFilters = false,
}: {
  title?: string;
  events: Event[];
  cta?: string;
  href?: string;
  loading?: boolean;
  /** Override section title font-weight (default 700). */
  titleFontWeight?: number;
  /** Override CTA link font-weight (default 600). */
  ctaFontWeight?: number;
  /** Enable premium micro-hover animation on the CTA (default false). */
  premiumCtaHover?: boolean;
  /** Disable scroll-triggered animations (default false). */
  disableAnimations?: boolean;
  /** Hide carousel arrows on desktop (lg+) breakpoints (default false). */
  hideCarouselArrowsOnDesktop?: boolean;
  /** Render the rail edge-to-edge without max-width constraints (default false). */
  fullBleed?: boolean;
  /** Enable home-like mobile hint indicators for horizontal overflow (default false). */
  enableMobilePeek?: boolean;
  /** Show the top-right CTA link in the section header (default true). */
  showHeaderCta?: boolean;
  /** Render title with one-time typed effect (no entrance motion on heading). */
  useTypedTitle?: boolean;
  /** Show Events/Specials pills (notifications styling) for local filtering. */
  showTypeFilters?: boolean;
  /** Include explicit "All" pill in type filters. */
  showAllTypeFilter?: boolean;
  /** Override date ribbon position on cards rendered by this section. */
  dateRibbonPosition?: "corner" | "middle";
  /** Remove title left padding so it aligns with the filter row. */
  alignTitleWithFilters?: boolean;
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const prefersReducedMotion = useReducedMotion();
  const [activeTypeFilter, setActiveTypeFilter] = useState<ListingTypeFilter>(null);
  const containerClass = fullBleed
    ? "w-full relative z-10 px-2 sm:px-3"
    : "mx-auto w-full max-w-[2000px] relative z-10 px-2";

  // Only block on parent loading; the feed is unified server-side.
  const showSkeleton = loading;

  // Group before render (key: title|day(start_date)|location) and memoize to avoid recomputation.
  const displayEvents = useMemo(() => {
    return (events || []).slice(0, 12);
  }, [events]);

  const typeCounts = useMemo(() => {
    const eventCount = displayEvents.filter((event) => event.type === "event").length;
    const specialCount = displayEvents.filter((event) => event.type === "special").length;
    return { eventCount, specialCount };
  }, [displayEvents]);

  const filteredEvents = useMemo(() => {
    if (!activeTypeFilter) return displayEvents;
    return displayEvents.filter((event) => event.type === activeTypeFilter);
  }, [displayEvents, activeTypeFilter]);

  const hasEvents = displayEvents.length > 0;
  const hasFilteredEvents = filteredEvents.length > 0;
  const headingClass = `font-urbanist text-xl sm:text-2xl md:text-2xl font-bold text-charcoal hover:text-sage transition-all duration-300 ${
    alignTitleWithFilters ? "pl-0 pr-3 sm:pr-4 py-1" : "px-3 sm:px-4 py-1"
  } hover:bg-card-bg/5 rounded-lg cursor-default`;
  const headingStyle = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: titleFontWeight,
  } as const;

  if (showSkeleton) {
    return (
      <section
        className="relative m-0 w-full"
        aria-label={title}
        style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <div className={containerClass}>
          <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
            <div className="h-8 sm:h-10 w-48 sm:w-64 bg-charcoal/10 rounded-lg animate-pulse px-3 sm:px-4 py-1" />
            {showHeaderCta && (
              <div className="inline-flex items-center gap-1 px-4 py-2 -mx-2">
                <div className="h-4 w-16 bg-charcoal/10 rounded-full animate-pulse" />
                <div className="h-4 w-4 bg-charcoal/10 rounded-full animate-pulse" />
              </div>
            )}
          </div>

          <div className="pt-2">
            <ScrollableSection
              showArrows={false}
              className="items-stretch py-2"
              enableMobilePeek={enableMobilePeek}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto min-w-[clamp(220px,18vw,320px)] list-none flex justify-center"
                >
                  <EventCardSkeleton />
                </div>
              ))}
            </ScrollableSection>
          </div>
        </div>
      </section>
    );
  }

  // Always show the section: with cards when we have events, or empty state + CTA when we don't
  return (
    <section
      className="relative m-0 w-full"
      aria-label={title}
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <div className={containerClass}>
        <div className={`${showTypeFilters && hasEvents ? "pb-2 sm:pb-3" : "pb-4 sm:pb-8 md:pb-10"} flex flex-wrap items-center justify-between gap-2`}>
          {useTypedTitle ? (
            <WavyTypedTitle
              text={title}
              as="h2"
              className={headingClass}
              typingSpeedMs={40}
              startDelayMs={0}
              disableWave={true}
              style={headingStyle}
            />
          ) : disableAnimations ? (
            <h2
              className={headingClass}
              style={headingStyle}
            >
              {title}
            </h2>
          ) : (
            <m.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={headingClass}
              style={headingStyle}
            >
              {title}
            </m.h2>
          )}

          {showHeaderCta && (
            <button
              onClick={() => router.push(href)}
              className={
                premiumCtaHover
                  ? "group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-colors duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative motion-reduce:transition-none"
                  : "group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-all duration-300 hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative"
              }
              aria-label={`${cta}: ${title}`}
            >
              <span
                className={
                  premiumCtaHover
                    ? "relative z-10 transition-[color] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] text-charcoal group-hover:text-sage after:content-[''] after:absolute after:-bottom-px after:left-0 after:h-px after:w-full after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:after:scale-x-100 motion-reduce:transition-none motion-reduce:after:transition-none"
                    : "relative z-10 transition-transform duration-300 group-hover:-translate-x-0.5 text-charcoal group-hover:text-sage"
                }
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: ctaFontWeight }}
              >
                {cta.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
              </span>
              <ArrowRight
                className={
                  premiumCtaHover
                    ? "relative z-10 w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:translate-x-[3px] text-charcoal group-hover:text-sage motion-reduce:transition-none"
                    : "relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 text-charcoal group-hover:text-sage"
                }
              />
            </button>
          )}
        </div>

        {showTypeFilters && hasEvents && (
          <div className="mb-3">
            <FilterPillGroup
              options={[
                ...(showAllTypeFilter
                  ? [{ value: null as ListingTypeFilter, label: "All", count: displayEvents.length }]
                  : []),
                { value: "event" as ListingTypeFilter, label: "Events", count: typeCounts.eventCount },
                { value: "special" as ListingTypeFilter, label: "Specials", count: typeCounts.specialCount },
              ]}
              value={activeTypeFilter}
              onChange={(value) => setActiveTypeFilter((value as ListingTypeFilter) ?? null)}
              ariaLabel="Event type filter"
              size="sm"
              showCounts
            />
          </div>
        )}

        {hasEvents ? (
          hasFilteredEvents ? (
            <div className="pt-2">
              <ScrollableSection
                showArrows={true}
                className="items-stretch py-2"
                hideArrowsOnDesktop={hideCarouselArrowsOnDesktop}
                enableMobilePeek={enableMobilePeek}
              >
                {isDesktop ? (
                  disableAnimations ? (
                    <div className="flex gap-3 items-stretch">
                      {filteredEvents.map((event, index) => (
                        <div
                          key={getStableEventRailKey(event)}
                          className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto min-w-[clamp(220px,18vw,320px)] list-none flex justify-center"
                        >
                          <EventCard event={event} index={index} dateRibbonPosition={dateRibbonPosition} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <m.div
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: "-50px" }}
                      className="flex gap-3 items-stretch"
                    >
                      {filteredEvents.map((event, index) => (
                        <m.div
                          key={getStableEventRailKey(event)}
                          variants={itemVariants}
                          className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto min-w-[clamp(220px,18vw,320px)] list-none flex justify-center"
                        >
                          <EventCard event={event} index={index} dateRibbonPosition={dateRibbonPosition} />
                        </m.div>
                      ))}
                    </m.div>
                  )
                ) : (
                  <>
                    {filteredEvents.map((event, index) => (
                      <div
                        key={getStableEventRailKey(event)}
                        className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto min-w-[clamp(220px,18vw,320px)] list-none flex justify-center"
                      >
                        <EventCard event={event} index={index} dateRibbonPosition={dateRibbonPosition} />
                      </div>
                    ))}
                  </>
                )}
              </ScrollableSection>
            </div>
          ) : (
            <div className="py-4">
              <div className="bg-off-white border border-charcoal/10 rounded-lg p-6 text-center">
                <p className="text-body text-charcoal/70 mb-2">
                  No {activeTypeFilter === "special" ? "specials" : "events"} available right now
                </p>
                <p className="text-body-sm text-charcoal/70">
                  Switch filters to view the other listings.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="py-4">
            <div className="bg-off-white border border-charcoal/10 rounded-lg p-6 text-center">
              <p className="text-body text-charcoal/70 mb-2">
                Curated events &amp; specials
              </p>
              <p className="text-body-sm text-charcoal/70">
                Business owners are adding new events and specials. Check back soon.
              </p>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => router.push(href)}
                  className="mi-tap inline-flex items-center justify-center gap-2 rounded-full min-h-[48px] px-6 py-3 text-body font-semibold text-white bg-gradient-to-r from-coral to-coral/85 hover:opacity-95 transition-all duration-200 shadow-md w-full sm:w-auto sm:min-w-[200px]"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  aria-label={`See more: ${title}`}
                >
                  <span>See More</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
