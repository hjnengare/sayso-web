// src/components/EventsSpecials/EventsSpecials.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import EventCard from "../EventCard/EventCard";
import EventCardSkeleton from "../EventCard/EventCardSkeleton";
import type { Event } from "../../lib/types/Event";
import ScrollableSection from "../ScrollableSection/ScrollableSection";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useIsDesktop } from "../../hooks/useIsDesktop";

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

export default function EventsSpecials({
  title = "Events & Specials",
  events,
  cta = "See More",
  href = "/events-specials",
  loading = false,
  titleFontWeight = 700,
  ctaFontWeight = 600,
  premiumCtaHover = false,
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
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  // Only block on parent loading; the feed is unified server-side.
  const showSkeleton = loading;

  // Group before render (key: title|day(start_date)|location) and memoize to avoid recomputation.
  const displayEvents = useMemo(() => {
    return (events || []).slice(0, 12);
  }, [events]);

  const hasEvents = displayEvents.length > 0;

  if (showSkeleton) {
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
            <div className="h-8 sm:h-10 w-48 sm:w-64 bg-charcoal/10 rounded-lg animate-pulse px-3 sm:px-4 py-1" />
            <div className="inline-flex items-center gap-1 px-4 py-2 -mx-2">
              <div className="h-4 w-16 bg-charcoal/10 rounded-full animate-pulse" />
              <div className="h-4 w-4 bg-charcoal/10 rounded-full animate-pulse" />
            </div>
          </div>

          <div className="pt-2">
            <ScrollableSection showArrows={false} className="items-stretch py-2">
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
      <div className="mx-auto w-full max-w-[2000px] relative z-10 px-2">
        <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-urbanist text-2xl sm:text-3xl md:text-2xl font-bold text-charcoal hover:text-sage transition-all duration-300 px-3 sm:px-4 py-1 hover:bg-card-bg/5 rounded-lg cursor-default"
            style={{
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontWeight: titleFontWeight,
            }}
          >
            {title}
          </motion.h2>

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
        </div>

        {hasEvents ? (
          <div className="pt-2">
            <ScrollableSection showArrows={true} className="items-stretch py-2">
              {isDesktop ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  className="flex gap-3 items-stretch"
                >
                  {displayEvents.map((event, index) => (
                    <motion.div
                      key={event.id ?? `event-${index}`}
                      variants={itemVariants}
                      className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto min-w-[clamp(220px,18vw,320px)] list-none flex justify-center"
                    >
                      <EventCard event={event} index={index} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <>
                  {displayEvents.map((event, index) => (
                    <div
                      key={event.id ?? `event-${index}`}
                      className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto min-w-[clamp(220px,18vw,320px)] list-none flex justify-center"
                    >
                      <EventCard event={event} index={index} />
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
