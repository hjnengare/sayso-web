"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Footer from "../components/Footer/Footer";
import FilterTabs from "../components/EventsPage/FilterTabs";
import ResultsCount from "../components/EventsPage/ResultsCount";
import EventsGrid from "../components/EventsPage/EventsGrid";
import EventsGridSkeleton from "../components/EventsPage/EventsGridSkeleton";
import EmptyState from "../components/EventsPage/EmptyState";
import SearchInput from "../components/SearchInput/SearchInput";
import type { Event } from "../lib/types/Event";
import { useDebounce } from "../hooks/useDebounce";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Loader } from "../components/Loader/Loader";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";
import ScrollToTopButton from "../components/Navigation/ScrollToTopButton";

const ITEMS_PER_PAGE = 20;

export default function EventsSpecialsPage() {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "event" | "special">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Debounce search query for smoother real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const fetchPage = async (nextOffset: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const url = new URL("/api/events-and-specials", window.location.origin);
      url.searchParams.set("limit", String(ITEMS_PER_PAGE));
      url.searchParams.set("offset", String(nextOffset));
      if (selectedFilter !== "all") {
        url.searchParams.set("type", selectedFilter);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const data = await res.json();
      const newItems = (data.items || []) as Event[];
      const total = Number(data.count || 0);

      setCount(total);
      setHasMore(nextOffset + ITEMS_PER_PAGE < total);
      setOffset(nextOffset);
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      if (!append) setItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch + refetch when filter changes
  useEffect(() => {
    setOffset(0);
    fetchPage(0, false);
  }, [selectedFilter]);

  // Merge events and specials for unified display
  const mergedEvents = useMemo(() => {
    return (items || []).slice().sort((a, b) => {
      const aDate = new Date(a.startDateISO || a.startDate).getTime();
      const bDate = new Date(b.startDateISO || b.startDate).getTime();
      return aDate - bDate;
    });
  }, [items]);

  // Client-side filtering for type (all/event/special)
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
        <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
      </div>
      {isDesktop ? (
        <div className="relative">
          <EventsGrid
            events={items}
            disableMotion
            cardWrapperClass="desktop-card-shimmer"
            cardOverlayClass="desktop-shimmer-veil"
          />
        </div>
      ) : (
        <motion.div
          key={`${title}-${items.length}`}
          initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <EventsGrid events={items} />
        </motion.div>
      )}
    </section>
  );

  return (
    <div className="min-h-dvh bg-off-white">

      <main
        className="bg-off-white"
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

          <nav aria-label="Breadcrumb">
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
                    className="px-5 py-2 rounded-full bg-sage text-white font-semibold shadow-md hover:bg-sage/90 transition duration-150"
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

      <ScrollToTopButton threshold={360} />

      <Footer />
    </div>
  );
}

