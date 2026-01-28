"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "../components/Footer/Footer";
import FilterTabs from "../components/EventsPage/FilterTabs";
import ResultsCount from "../components/EventsPage/ResultsCount";
import EventsGrid from "../components/EventsPage/EventsGrid";
import EventsGridSkeleton from "../components/EventsPage/EventsGridSkeleton";
import EmptyState from "../components/EventsPage/EmptyState";
import SearchInput from "../components/SearchInput/SearchInput";
import type { Event } from "../lib/types/Event";
import { useDebounce } from "../hooks/useDebounce";
import { useEventsWithGlobalConsolidation } from "../hooks/useEvents";
import { useSpecials } from "../hooks/useSpecials";
import { ChevronUp, ChevronRight, ChevronDown } from "lucide-react";
import { Loader } from "../components/Loader/Loader";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

const ITEMS_PER_PAGE = 20;

export default function EventsSpecialsPage() {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "event" | "special">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Debounce search query for smoother real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch events with global consolidation
  const {
    events: allEvents,
    loading: eventsLoading,
    loadingMore,
    error: eventsError,
    hasMore,
    loadMore,
  } = useEventsWithGlobalConsolidation({
    pageSize: ITEMS_PER_PAGE,
    search: debouncedSearchQuery.trim() || undefined,
    upcoming: true,
  });

  // Fetch business specials (merged into the same grid)
  const {
    specials: allSpecials,
    loading: specialsLoading,
    error: specialsError,
    hasMore: specialsHasMore,
    loadMore: loadMoreSpecials,
  } = useSpecials({
    limit: ITEMS_PER_PAGE,
    search: debouncedSearchQuery.trim() || undefined,
  });

  // Merge events and specials for unified display
  const mergedEvents = useMemo(() => {
    // Merge and sort by startDate (descending)
    const merged = [...allEvents, ...allSpecials];
    return merged.sort((a, b) => {
      const aDate = new Date(a.startDateISO || a.startDate).getTime();
      const bDate = new Date(b.startDateISO || b.startDate).getTime();
      return bDate - aDate;
    });
  }, [allEvents, allSpecials]);

  // Client-side filtering for type (all/event/special)
  const filteredEvents = useMemo(() => {
    return mergedEvents.filter((event) =>
      selectedFilter === "all" || event.type === selectedFilter
    );
  }, [mergedEvents, selectedFilter]);

  const currentEvents = filteredEvents;

  // Reset when filter changes
  useEffect(() => {
    // Reset is handled by the hook when search changes
    // This effect is for filter type changes only
  }, [selectedFilter]);

  useEffect(() => {
    const updateIsDesktop = () => setIsDesktop(typeof window !== "undefined" && window.innerWidth >= 1024);
    updateIsDesktop();
    window.addEventListener("resize", updateIsDesktop);
    return () => window.removeEventListener("resize", updateIsDesktop);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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


  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle load more button click
  const handleLoadMore = async () => {
    await loadMore();
  };

  return (
    <div className="min-h-dvh bg-off-white">

      <main
        className="bg-off-white pt-20 sm:pt-24 pb-28"
        style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <div className="mx-auto w-full max-w-[2000px] px-2">
          <style>{`
            .desktop-card-shimmer {
              position: relative;
              overflow: hidden;
            }
            .desktop-shimmer-veil {
              pointer-events: none;
              position: absolute;
              inset: 0;
              background: linear-gradient(120deg, rgba(255,255,255,0) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 55%);
              transform: translateX(-150%);
              animation: desktopShimmer 10s linear infinite;
              opacity: 0.4;
            }
            @keyframes desktopShimmer {
              0% { transform: translateX(-150%); }
              100% { transform: translateX(150%); }
            }
          `}</style>

          <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
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
                <span
                  className="text-charcoal font-semibold"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  Events & Specials
                </span>
              </li>
            </ol>
          </nav>

          {/* Title and Description Block */}
          <div className="mb-6 sm:mb-8 px-4 sm:px-6 text-center pt-4">
            <div className="my-4">
              <h1 
                className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-[1.2] tracking-tight text-charcoal mx-auto font-urbanist"
                style={{ 
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  hyphens: 'none',
                }}
              >
                <WavyTypedTitle
                  text="Events & Specials"
                  as="span"
                  className="inline-block"
                  typingSpeedMs={50}
                  startDelayMs={200}
                  disableWave={true}
                  enableScrollTrigger={true}
                  style={{
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                    whiteSpace: 'normal',
                    hyphens: 'none',
                  }}
                />
              </h1>
            </div>
            <p className="text-sm sm:text-base text-charcoal/70 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Discover exciting local events and exclusive special offers. 
              Find concerts, festivals, workshops, and limited-time deals happening near you.
            </p>
          </div>

          <div className="py-4 px-4">
            <SearchInput
              variant="header"
              placeholder="Search events and limited-time offers..."
              mobilePlaceholder="Search events & specials..."
              onSearch={handleSearch}
              onSubmitQuery={handleSubmitQuery}
              showFilter={false}
              showSearchIcon={false}
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
            {(eventsLoading || specialsLoading) ? (
              <EventsGridSkeleton count={ITEMS_PER_PAGE} />
            ) : (eventsError || specialsError) ? (
              <div className="text-center py-20">
                <p className="text-coral mb-4">Failed to load {eventsError ? 'events' : 'specials'}</p>
                <p className="text-charcoal/60 text-sm">{eventsError || specialsError}</p>
              </div>
            ) : currentEvents.length > 0 ? (
              <>
                {/* Events & Specials Grid with Smooth Entry Animation */}
                <AnimatePresence mode="wait" initial={false}>
                  {isDesktop ? (
                    <div className="relative">
                      <EventsGrid
                        events={currentEvents}
                        disableMotion={true}
                        cardWrapperClass="desktop-card-shimmer"
                        cardOverlayClass="desktop-shimmer-veil"
                      />
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
                      transition={{
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <EventsGrid events={currentEvents} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Load More Button (shows if either has more) */}
                {(hasMore || specialsHasMore) && (
                  <div className="flex items-center justify-center py-8">
                    <button
                      onClick={async () => {
                        if (hasMore) await handleLoadMore();
                        if (specialsHasMore) await loadMoreSpecials();
                      }}
                      disabled={loadingMore || specialsLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-navbar-bg text-white rounded-full font-medium hover:bg-navbar-bg/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      {(loadingMore || specialsLoading) ? (
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
              </>
            ) : (
              <EmptyState filterType={selectedFilter} />
            )}
          </div>
        </div>
      </main>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-navbar-bg hover:bg-navbar-bg backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-all duration-300"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}

      <Footer />
    </div>
  );
}
