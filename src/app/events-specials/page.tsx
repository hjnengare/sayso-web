"use client";

import { useMemo, useState, useEffect } from "react";
import { useEventsSpecials } from "../hooks/useEventsSpecials";
import Link from "next/link";
import { m } from "framer-motion";
import Footer from "../components/Footer/Footer";
import FilterTabs from "../components/EventsPage/FilterTabs";
import ResultsCount from "../components/EventsPage/ResultsCount";
import EventCard from "../components/EventCard/EventCard";
import EventCardSkeleton from "../components/EventCard/EventCardSkeleton";
import EventsGridSkeleton from "../components/EventsPage/EventsGridSkeleton";
import EmptyState from "../components/EventsPage/EmptyState";
import SearchInput from "../components/SearchInput/SearchInput";
import type { Event } from "../lib/types/Event";
import { useDebounce } from "../hooks/useDebounce";
import { ChevronRight, ChevronDown, ChevronLeft } from "lucide-react";
import { Loader } from "../components/Loader/Loader";
import { useIsDesktop } from "../hooks/useIsDesktop";
const ITEMS_PER_PAGE = 20;
const REQUEST_TIMEOUT_MS = 12000;
const REQUEST_RETRY_DELAY_MS = 250;

// Animation variants for staggered card appearance
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

export default function EventsSpecialsPage() {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "event" | "special">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const [optimisticSkeletons, setOptimisticSkeletons] = useState(0);

  // Debounce search query for smoother real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // SWR-backed events list (caching, dedup, pre-fetch next page)
  const { items, count, hasMore, loading, loadingMore, error, fetchMore } = useEventsSpecials(
    selectedFilter,
    debouncedSearchQuery
  );

  const handleLoadMoreWithSkeletons = async () => {
    setOptimisticSkeletons(ITEMS_PER_PAGE);
    await fetchMore();
    setOptimisticSkeletons(0);
  };

  // Merge events and specials for unified display
  // Note: API already sorts by startDate, so no need to re-sort here
  const mergedEvents = useMemo(() => {
    return items || [];
  }, [items]);

  // Client-side filtering for search query
  const filteredEvents = useMemo(() => {
    let filtered = mergedEvents;

    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        const haystack = `${item.title ?? ""} ${item.location ?? ""} ${item.description ?? ""}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    return filtered;
  }, [mergedEvents, debouncedSearchQuery]);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matches = mergedEvents.filter((item) => {
      const haystack = `${item.title ?? ""} ${item.location ?? ""} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
    return matches.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.location || undefined,
      typeLabel: item.type === "event" ? "Event" : "Special",
      href: item.type === "event" ? `/event/${item.id}` : `/special/${item.id}`,
    }));
  }, [mergedEvents, searchQuery]);

  const eventsSectionItems = filteredEvents.filter((event) => event.type === "event");
  const specialsSectionItems = filteredEvents.filter((event) => event.type === "special");

  useEffect(() => {
    const updateIsDesktop = () => setIsDesktop(typeof window !== "undefined" && window.innerWidth >= 1024);
    updateIsDesktop();
    window.addEventListener("resize", updateIsDesktop);
    return () => window.removeEventListener("resize", updateIsDesktop);
  }, []);

  const handleFilterChange = (filter: "all" | "event" | "special") => {
    setSelectedFilter(filter);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSubmitQuery = (query: string) => {
    setSearchQuery(query);
  };

  // Handle load more button click
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    await handleLoadMoreWithSkeletons();
  };

  const handleRetry = () => {
    // Trigger re-fetch by changing filter slightly then back, or use window.location.reload
    // SWR will re-validate automatically on next render
    setSelectedFilter(f => f);
  };

  const hasAnyData = Array.isArray(items) && items.length > 0;
  const isLoading = loading;
  const hasError = Boolean(error);
  const isBlockingError = !hasAnyData && hasError;
  const showPartialErrorBanner = hasAnyData && hasError;
  const shouldShowCta = !hasAnyData && !isLoading && !hasError;
  const combinedErrorMessage = error;

  const renderGridSection = (items: Event[], title: string) => (
    <section key={title} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{title}</h2>
      </div>
      {isDesktop ? (
        <m.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
        >
          {items.map((event, index) => (
            <m.div
              key={event.id}
              variants={itemVariants}
              className="list-none relative desktop-card-shimmer"
            >
              <span aria-hidden className="desktop-shimmer-veil" />
              <EventCard event={event} index={index} />
            </m.div>
          ))}
          {/* Optimistic skeleton cards during load more */}
          {optimisticSkeletons > 0 && Array.from({ length: optimisticSkeletons }).map((_, idx) => (
            <m.div
              key={`skeleton-${idx}`}
              variants={itemVariants}
              className="list-none"
            >
              <EventCardSkeleton />
            </m.div>
          ))}
        </m.div>
      ) : (
        <m.div
          key={title}
          initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {items.map((event, index) => (
              <m.div
                key={event.id}
                className="list-none"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 200,
                  delay: index * 0.06 + 0.1,
                }}
              >
                <EventCard event={event} index={index} />
              </m.div>
            ))}
            {/* Optimistic skeleton cards during load more */}
            {optimisticSkeletons > 0 && Array.from({ length: optimisticSkeletons }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="list-none">
                <EventCardSkeleton />
              </div>
            ))}
          </div>
        </m.div>
      )}
    </section>
  );

  return (
    <div className="min-h-dvh relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />


      <main
        className="relative"
        style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        
        <div className="relative mx-auto w-full max-w-[2000px] px-2">
          <nav className="relative z-10 pb-1" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link
                  href="/home"
                  className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  Home
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 text-charcoal/60" />
              </li>
              <li>
                <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Events & Specials
                </span>
              </li>
            </ol>
          </nav>

          {/* Title and Description Block */}
          <div className="relative z-10 mb-6 sm:mb-8 px-4 sm:px-6 text-center pt-4">
            <div className="my-4">
              <h1 
                className="text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.2] tracking-tight text-charcoal mx-auto font-urbanist"
                style={{ 
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  hyphens: 'none',
                }}
              >
                <span className="inline-block font-bold" style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  hyphens: 'none',
                }}>Events & Specials</span>
              </h1>
            </div>
            <p className="text-sm sm:text-base text-charcoal/70 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Discover exciting local events and exclusive special offers. 
              Find concerts, festivals, workshops, and limited-time deals happening near you.
            </p>
          </div>

          <div className="relative z-10 py-4 px-4">
            <SearchInput
              variant="header"
              placeholder="Search events and limited-time offers..."
              mobilePlaceholder="Search events & specials..."
              onSearch={handleSearch}
              onSubmitQuery={handleSubmitQuery}
              showFilter={false}
              showSearchIcon={false}
              enableSuggestions={true}
              suggestionsMode="custom"
              customSuggestions={searchSuggestions}
            />
            {/* Show search status indicator */}
            {debouncedSearchQuery.trim().length > 0 && (
              <div className="mt-2 px-2 text-sm text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                {filteredEvents.length > 0
                  ? `Found ${filteredEvents.length} result${filteredEvents.length === 1 ? '' : 's'} for "${debouncedSearchQuery}"`
                  : `No results found for "${debouncedSearchQuery}"`
                }
              </div>
            )}
          </div>

          <div className="py-4 flex flex-col gap-4">
            <FilterTabs selectedFilter={selectedFilter} onFilterChange={handleFilterChange} />
            <ResultsCount count={filteredEvents.length} filterType={selectedFilter} />
          </div>

          <div className="py-4">
            {isLoading ? (
              <EventsGridSkeleton count={ITEMS_PER_PAGE} />
            ) : isBlockingError ? (
              <div className="text-center py-20">
                <p className="text-coral mb-4">Failed to load events & specials</p>
                <p className="text-charcoal/60 text-sm">{combinedErrorMessage}</p>
                <div className="mt-4">
                  <button
                    onClick={handleRetry}
                    className="px-5 py-2 rounded-full bg-card-bg text-white font-semibold shadow-md hover:bg-card-bg/90 transition duration-150"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : shouldShowCta ? (
              <div className="rounded-[24px] border border-charcoal/10 bg-off-white p-6 text-center space-y-4">
                <p className="text-lg font-semibold text-charcoal">
                  We’re curating something special for you
                </p>
                <p className="text-sm text-charcoal/70">
                  Business owners are manually adding curated events and specials. Check back soon for the latest experiences.
                </p>
                <ul className="list-none space-y-1 text-sm text-charcoal/70">
                  <li>Explore businesses</li>
                  <li>Follow businesses</li>
                  <li>Check back later</li>
                </ul>
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <Link
                    href="/home"
                    className="px-5 py-2 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition"
                  >
                    Explore businesses
                  </Link>
                </div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <EmptyState filterType={selectedFilter} />
            ) : (
              <div className="space-y-10">
                {showPartialErrorBanner && (
                  <div className="rounded-[16px] border border-charcoal/10 bg-off-white/70 backdrop-blur-md px-4 py-3 flex items-start justify-between gap-3">
                    <div className="text-sm text-charcoal/70">
                      Some results may be missing: {combinedErrorMessage}
                    </div>
                    <button
                      onClick={handleRetry}
                      className="shrink-0 mi-tap px-4 py-1.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {eventsSectionItems.length > 0 && renderGridSection(eventsSectionItems, "Events")}
                {specialsSectionItems.length > 0 && renderGridSection(specialsSectionItems, "Specials")}
                {hasMore && (
                  <div className="flex items-center justify-center py-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-6 py-3 bg-navbar-bg text-white rounded-full font-medium hover:bg-navbar-bg/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      {loadingMore ? (
                        <>
                          <Loader size="sm" variant="spinner" color="white" />
                          <span>Loading more...</span>
                        </>
                      ) : (
                        <>
                          <span>Load More Results</span>
                          <ChevronDown className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {isDesktop && (
        <style jsx>{`
          .desktop-card-shimmer {
            position: relative;
          }
          .desktop-shimmer-veil {
            position: absolute;
            inset: -2px;
            pointer-events: none;
            background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 65%, transparent 100%);
            opacity: 0.08;
            animation: desktopShimmer 10s linear infinite;
          }
          @keyframes desktopShimmer {
            0% { transform: translateX(-120%); }
            40% { transform: translateX(120%); }
            100% { transform: translateX(120%); }
          }
        `}</style>
      )}

      <Footer />
    </div>
  );
}

