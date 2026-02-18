"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Calendar } from "lucide-react";
import type { Event } from "../../lib/types/Event";
import nextDynamic from "next/dynamic";
import { PageLoader } from "../../components/Loader";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";
import ReviewsList from "../../components/Reviews/ReviewsList";
import type { EventReviewWithUser } from "../../lib/types/database";
import {
  EventHeroImage,
  EventInfo,
  EventDetailsCard,
  EventDescription,
  EventActionCard,
  EventContactInfo,
  EventLocation,
  EventPersonalizationInsights,
} from "../../components/EventDetail";

// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

const Footer = nextDynamic(() => import("../../components/Footer/Footer"), {
  loading: () => null,
  ssr: false,
});

interface EventDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [reviews, setReviews] = useState<EventReviewWithUser[]>([]);
  const [occurrencesList, setOccurrencesList] = useState<
    Array<{ id: string; start_date: string; end_date: string | null; booking_url?: string | null; location?: string | null }>
  >([]);
  const [occurrencesCount, setOccurrencesCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasReviewed = false;
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const requestVersionRef = useRef(0);
  const hasDirectCta =
    Boolean(event?.bookingUrl || event?.purchaseUrl || (event as any)?.ticketmaster_url || (event as any)?.url) ||
    (((event?.ctaSource ?? "").toLowerCase() === "whatsapp" || Boolean(event?.whatsappNumber)) && Boolean(event));

  const scrollToMap = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };


  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);

  useEffect(() => {
    const controller = new AbortController();
    const requestVersion = ++requestVersionRef.current;
    let isCurrent = true;

    const isStaleRequest = () =>
      !isCurrent ||
      controller.signal.aborted ||
      requestVersion !== requestVersionRef.current;

    const fetchEvent = async () => {
      setIsLoading(true);
      setIsNotFound(false);
      setLoadError(null);
      setEvent(null);
      setReviews([]);
      setOccurrencesList([]);
      setOccurrencesCount(1);

      try {
        const response = await fetch(`/api/events-and-specials/${resolvedParams.id}`, {
          signal: controller.signal,
        });

        if (isStaleRequest()) return;

        if (!response.ok) {
          if (response.status === 404) {
            setEvent(null);
            setIsNotFound(true);
            return;
          }
          throw new Error(`Failed to fetch event: ${response.statusText}`);
        }

        const data = await response.json();

        // Consolidated API: already returns the front-end Event shape
        if (!data?.event || (data.event.type !== "event" && data.event.type !== "special")) {
          setEvent(null);
          setIsNotFound(true);
          return;
        }

        if (isStaleRequest()) return;

        setEvent(data.event as Event);
        setIsNotFound(false);
        setOccurrencesList(Array.isArray(data?.occurrences_list) ? data.occurrences_list : []);
        setOccurrencesCount(
          Number.isFinite(Number(data?.occurrences))
            ? Number(data.occurrences)
            : Array.isArray(data?.occurrences_list)
              ? data.occurrences_list.length
              : 1,
        );

        // Fetch reviews, but don't let review failures break the event detail page.
        try {
          const reviewsResponse = await fetch(`/api/events/${resolvedParams.id}/reviews`, {
            signal: controller.signal,
          });

          if (isStaleRequest()) return;

          if (!reviewsResponse.ok) {
            setReviews([]);
            return;
          }

          const reviewsData = await reviewsResponse.json();
          if (isStaleRequest()) return;
          setReviews(Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : []);
        } catch (reviewError) {
          if ((reviewError as Error)?.name !== "AbortError") {
            if (isStaleRequest()) return;
            setReviews([]);
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError" && !isStaleRequest()) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[EventDetailPage] Error fetching event:", err);
          }
          setLoadError("We could not load this event right now. Please try again.");
          setIsNotFound(false);
          setEvent(null);
        }
      } finally {
        if (!isStaleRequest()) {
          setIsLoading(false);
        }
      }
    };

    fetchEvent();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [resolvedParams.id]);


  const refetchReviews = async () => {
    try {
      const response = await fetch(`/api/events/${resolvedParams.id}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      } else {
        setReviews([]);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error refetching reviews:", error);
      }
      setReviews([]);
    }
  };

  // Loading state - show full page loader with transition
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-off-white">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-off-white min-h-screen w-full flex items-center justify-center"
          >
            <PageLoader size="lg" variant="wavy" color="sage"  />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="min-h-dvh bg-off-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-white/40">
            <Calendar className="w-7 h-7 text-charcoal" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Event Not Found</h1>
          <Link href="/events" className="px-6 py-2.5 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full text-sm font-600 hover:bg-charcoal/90 transition-all duration-300 border border-white/30 inline-block" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Back to Events & Specials
          </Link>
        </div>
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="min-h-dvh bg-off-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-white/40">
            <Calendar className="w-7 h-7 text-charcoal" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Unable to Load Event</h1>
          <p className="text-charcoal/70 mb-6" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            {loadError || "Please try again."}
          </p>
          <Link href="/events" className="px-6 py-2.5 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full text-sm font-600 hover:bg-charcoal/90 transition-all duration-300 border border-white/30 inline-block" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Back to Events & Specials
          </Link>
        </div>
      </div>
    );
  }

  const eventMediaLayoutId = `event-media-${event.id}`;
  const eventTitleLayoutId = `event-title-${event.id}`;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-dvh bg-off-white font-urbanist"
        style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
      >

        <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white relative overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
   
            {/* Main Content Section */}
            <section
              className="relative"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              }}
            >
              <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
                {/* Breadcrumb Navigation */}
                <nav className="pt-2" aria-label="Breadcrumb">
                  <ol className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base flex-nowrap min-w-0">
                    <li className="shrink-0">
                      <Link href="/events-specials" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium whitespace-nowrap flex items-center gap-1.5">
                        <ChevronLeft className="w-4 h-4" />
                        Back to Events & Specials
                      </Link>
                    </li>
                  </ol>
                </nav>

                <div className="pt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                      <EventHeroImage event={event} sharedLayoutId={eventMediaLayoutId} />
                      <EventInfo event={event} sharedTitleLayoutId={eventTitleLayoutId} />
                      <EventDescription event={event} />
                      <EventDetailsCard event={event} />

                      {(() => {
                        // Compute the current event's date label to exclude from "More dates"
                        const currentStart = new Date(event.startDateISO || event.startDate);
                        const currentEnd = event.endDateISO || event.endDate ? new Date(event.endDateISO || event.endDate!) : null;
                        const currentSameDay =
                          currentEnd &&
                          currentStart.getFullYear() === currentEnd.getFullYear() &&
                          currentStart.getMonth() === currentEnd.getMonth() &&
                          currentStart.getDate() === currentEnd.getDate();
                        const currentStartLabel = Number.isFinite(currentStart.getTime())
                          ? currentStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : event.startDate;
                        const currentEndLabel =
                          currentEnd && Number.isFinite(currentEnd.getTime())
                            ? currentEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : undefined;
                        const currentDateLabel = currentEnd && !currentSameDay && currentEndLabel
                          ? `${currentStartLabel}–${currentEndLabel}`
                          : currentStartLabel;

                        const otherDates = occurrencesList
                          .reduce<Array<{ id: string; label: string }>>((unique, o) => {
                            const start = new Date(o.start_date);
                            const end = o.end_date ? new Date(o.end_date) : null;
                            const sameDay =
                              end &&
                              start.getFullYear() === end.getFullYear() &&
                              start.getMonth() === end.getMonth() &&
                              start.getDate() === end.getDate();

                            const startLabel = Number.isFinite(start.getTime())
                              ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : o.start_date;
                            const endLabel =
                              end && Number.isFinite(end.getTime())
                                ? end.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                : o.end_date;

                            const label = end && !sameDay && endLabel ? `${startLabel}–${endLabel}` : startLabel;

                            if (label !== currentDateLabel && !unique.some((u) => u.label === label)) {
                              unique.push({ id: o.id, label });
                            }
                            return unique;
                          }, []);

                        if (otherDates.length === 0) return null;

                        return (
                          <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] ring-1 ring-white/30 shadow-md p-4 sm:p-6">
                            <h3
                              className="text-h3 font-semibold text-charcoal mb-3"
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                              More dates
                            </h3>
                            <ul className="space-y-2">
                              {otherDates.map((o) => {
                                const hrefBase = event?.type === "special" ? "/special" : "/event";
                                return (
                                  <li key={o.id} className="flex items-center justify-between gap-3">
                                    <span
                                      className="text-body-sm text-charcoal/80"
                                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                    >
                                      {o.label}
                                    </span>
                                    <Link
                                      href={`${hrefBase}/${o.id}`}
                                      className="text-body-sm font-semibold text-coral hover:underline"
                                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                    >
                                      View
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })()}

                      {/* Contact Info - Mobile Only (hide when direct booking is available) */}
                      {!hasDirectCta && (
                        <div className="lg:hidden">
                          <EventContactInfo event={event} />
                        </div>
                      )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-4 sm:space-y-6">
                      <EventActionCard
                        eventId={event.id}
                        hasReviewed={hasReviewed}
                        bookingUrl={event.bookingUrl}
                        purchaseUrl={event.purchaseUrl}
                        ticketmasterUrl={(event as any).ticketmaster_url || (event as any).url}
                        bookingContact={event.bookingContact}
                        eventData={event}
                      />
                      <EventPersonalizationInsights event={{ id: event.id, rating: event.rating, totalReviews: reviews.length }} />

                      {/* Contact Info - Desktop Only (hide when direct booking is available) */}
                      {!hasDirectCta && (
                        <div className="hidden lg:block">
                          <EventContactInfo event={event} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Reviews Section */}
            <section className="mx-auto w-full max-w-[2000px] px-2 relative z-10 mt-8">
              <div className="text-center mb-6">
                <WavyTypedTitle
                  text="Event Reviews"
                  as="h2"
                  className="font-urbanist text-lg sm:text-xl font-700 text-charcoal"
                  typingSpeedMs={40}
                  startDelayMs={300}
                  disableWave={true}
                  style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 700 }}
                />
              </div>

              <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md p-6 sm:p-8">
                <ReviewsList
                  reviews={reviews.map((review): any => ({
                    ...review,
                    business_id: event.id,
                  }))}
                  loading={false}
                  error={null}
                  showBusinessInfo={false}
                  onUpdate={refetchReviews}
                  emptyMessage="No reviews yet. Be the first to review this event!"
                  emptyStateAction={{
                    label: hasReviewed ? 'Already Reviewed' : 'Write First Review',
                    href: `/write-review/event/${event.id}`,
                    disabled: hasReviewed,
                  }}
                />
              </div>
            </section>
          </div>

        <Footer />
      </motion.div>
    </AnimatePresence>
  );
}

