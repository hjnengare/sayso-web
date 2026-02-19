"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [optimisticSkeletons, setOptimisticSkeletons] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Prefetch cache to make subsequent "Load More" clicks instant
  const prefetchCacheRef = useRef<{ offset: number; data: any } | null>(null);
  const requestSequenceRef = useRef(0);

  const fetchJsonWithTimeout = async (url: string, retryOnTimeout = true) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      return await res.json();
    } catch (error: any) {
      const isTimeoutAbort = error?.name === "AbortError";
      if (isTimeoutAbort && retryOnTimeout) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_RETRY_DELAY_MS));
        return fetchJsonWithTimeout(url, false);
      }
      if (isTimeoutAbort) {
        throw new Error("Request timed out. Please try again.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  // Debounce search query for smoother real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const fetchPage = async (nextOffset: number, append: boolean) => {
    const requestId = ++requestSequenceRef.current;

    try {
      if (append) {
        setLoadingMore(true);
        // Check if we have prefetched data for instant use
        if (prefetchCacheRef.current?.offset === nextOffset) {
          const { data } = prefetchCacheRef.current;
          const newItems = (data.items || []) as Event[];
          const total = Number(data.count || 0);
          
          setCount(total);
          setHasMore(nextOffset + ITEMS_PER_PAGE < total);
          setOffset(nextOffset);
          setItems((prev) => [...prev, ...newItems]);
          
          // Clear cache after use
          prefetchCacheRef.current = null;
          
          // Prefetch next page in background
          const nextNextOffset = nextOffset + ITEMS_PER_PAGE;
          if (nextNextOffset < total) {
            prefetchNextPage(nextNextOffset);
          }
          
          setLoadingMore(false);
          return;
        }
        
        // Optimistic UI: Show skeletons immediately for instant feedback
        setOptimisticSkeletons(ITEMS_PER_PAGE);
      } else {
        setLoading(true);
        // Clear prefetch cache when starting fresh
        prefetchCacheRef.current = null;
      }
      setError(null);

      const url = new URL("/api/events-and-specials", window.location.origin);
      url.searchParams.set("limit", String(ITEMS_PER_PAGE));
      url.searchParams.set("offset", String(nextOffset));
      if (selectedFilter !== "all") {
        url.searchParams.set("type", selectedFilter);
      }

      const data = await fetchJsonWithTimeout(url.toString());
      if (requestId !== requestSequenceRef.current) return;
      const newItems = (data.items || []) as Event[];
      const total = Number(data.count || 0);

      setCount(total);
      setHasMore(nextOffset + ITEMS_PER_PAGE < total);
      setOffset(nextOffset);
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      
      // Prefetch next page in background if more data exists
      if (append && nextOffset + ITEMS_PER_PAGE < total) {
        prefetchNextPage(nextOffset + ITEMS_PER_PAGE);
      }
    } catch (e: any) {
      if (requestId !== requestSequenceRef.current) return;
      setError(e?.message || "Failed to load");
      if (!append) setItems([]);
    } finally {
      if (requestId !== requestSequenceRef.current) return;
      setLoading(false);
      setLoadingMore(false);
      setOptimisticSkeletons(0);
    }
  };

  // Prefetch the next page in background for instant "Load More" experience
  const prefetchNextPage = async (prefetchOffset: number) => {
    try {
      const url = new URL("/api/events-and-specials", window.location.origin);
      url.searchParams.set("limit", String(ITEMS_PER_PAGE));
      url.searchParams.set("offset", String(prefetchOffset));
      if (selectedFilter !== "all") {
        url.searchParams.set("type", selectedFilter);
      }

      const res = await fetch(url.toString());
      if (!res.ok) return; // Silent fail for prefetch
      
      const data = await res.json();
      prefetchCacheRef.current = { offset: prefetchOffset, data };
    } catch (e) {
      // Silent fail - prefetch is optional enhancement
    }
  };

  // Fetch when filter or search changes.
  // When a search is active, hit the API with `search` so ALL matching events are
  // returned (including manually curated ones beyond the current page window).
  useEffect(() => {
    setOffset(0);
    // Clear prefetch cache when filter or search changes
    prefetchCacheRef.current = null;
    
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.trim();
      setLoading(true);
      setError(null);
      const url = new URL("/api/events-and-specials", window.location.origin);
      url.searchParams.set("search", q);
      if (selectedFilter !== "all") url.searchParams.set("type", selectedFilter);
      fetch(url.toString())
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setItems((data.items || []) as Event[]);
          setCount(data.count || 0);
          setHasMore(false); // all matches returned at once
        })
        .catch((e: any) => {
          setError(e?.message || "Failed to search");
          setItems([]);
        })
        .finally(() => setLoading(false));
    } else {
      fetchPage(0, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, debouncedSearchQuery]);

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
    await fetchPage(offset + ITEMS_PER_PAGE, true);
  };

  const handleRetry = async () => {
    await fetchPage(0, false);
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
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
        >
          {items.map((event, index) => (
            <motion.div
              key={event.id}
              variants={itemVariants}
              className="list-none relative desktop-card-shimmer"
            >
              <span aria-hidden className="desktop-shimmer-veil" />
              <EventCard event={event} index={index} />
            </motion.div>
          ))}
          {/* Optimistic skeleton cards during load more */}
          {optimisticSkeletons > 0 && Array.from({ length: optimisticSkeletons }).map((_, idx) => (
            <motion.div
              key={`skeleton-${idx}`}
              variants={itemVariants}
              className="list-none"
            >
              <EventCardSkeleton />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
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
              <motion.div
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
              </motion.div>
            ))}
            {/* Optimistic skeleton cards during load more */}
            {optimisticSkeletons > 0 && Array.from({ length: optimisticSkeletons }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="list-none">
                <EventCardSkeleton />
              </div>
            ))}
          </div>
        </motion.div>
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

