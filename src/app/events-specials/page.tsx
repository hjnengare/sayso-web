"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import FilterTabs from "../components/EventsPage/FilterTabs";
import ResultsCount from "../components/EventsPage/ResultsCount";
import EventsGrid from "../components/EventsPage/EventsGrid";
import Pagination from "../components/EventsPage/Pagination";
import EmptyState from "../components/EventsPage/EmptyState";
import SearchInput from "../components/SearchInput/SearchInput";
import { EVENTS_AND_SPECIALS, Event } from "../data/eventsData";
import { useToast } from "../contexts/ToastContext";
import { useDebounce } from "../hooks/useDebounce";
import { ChevronUp, ChevronRight } from "react-feather";
import { Loader } from "../components/Loader/Loader";
import StaggeredContainer from "../components/Animations/StaggeredContainer";
import AnimatedElement from "../components/Animations/AnimatedElement";

const ITEMS_PER_PAGE = 12;

export default function EventsSpecialsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "event" | "special">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const { showToast } = useToast();
  const previousPageRef = useRef(currentPage);

  // Debounce search query for smoother real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Enhanced text-based search with debouncing
  const filteredEvents = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    
    // If no search query, just filter by type
    if (query.length === 0) {
      return EVENTS_AND_SPECIALS.filter((event) => 
        selectedFilter === "all" || event.type === selectedFilter
      );
    }

    // Enhanced search: search across multiple fields
    return EVENTS_AND_SPECIALS.filter((event) => {
      const matchesFilter = selectedFilter === "all" || event.type === selectedFilter;
      
      if (!matchesFilter) return false;

      // Search in title, description, location, price, and startDate
      const searchableText = [
        event.title,
        event.description,
        event.location,
        event.price,
        event.startDate,
        event.endDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // Check if query matches any part of the searchable text
      const matchesQuery = searchableText.includes(query) ||
        // Also check individual words for better matching
        query.split(/\s+/).every((word) => searchableText.includes(word));

      return matchesQuery;
    });
  }, [selectedFilter, debouncedSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));

  const currentEvents = useMemo(() => {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleFilterChange = (filter: "all" | "event" | "special") => {
    setSelectedFilter(filter);
    setCurrentPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Reset to first page when search changes
    if (query !== debouncedSearchQuery) {
      setCurrentPage(1);
    }
  };

  const handleSubmitQuery = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleBookmark = (event: Event) => {
    showToast(`${event.title} saved to your bookmarks!`, "success");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle pagination with loader and transitions
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;
    
    // Show loader
    setIsPaginationLoading(true);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    // Wait for scroll and show transition
    setTimeout(() => {
      previousPageRef.current = currentPage;
      setCurrentPage(newPage);
      
      // Hide loader after brief delay for smooth transition
      setTimeout(() => {
        setIsPaginationLoading(false);
      }, 300);
    }, 150);
  };

  return (
    <div className="min-h-dvh bg-off-white">
      <Header
        showSearch={true}
        variant="white"
        backgroundClassName="bg-navbar-bg"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />

      <StaggeredContainer>
        <main
          className="bg-off-white pt-20 sm:pt-24 pb-28"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        >
          <div className="mx-auto w-full max-w-[2000px] px-2">
            <AnimatedElement index={0} direction="top">
              <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm sm:text-base">
                  <li>
                    <Link
                      href="/home"
                      className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                      style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      }}
                    >
                      Home
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 text-charcoal/40" />
                  </li>
                  <li>
                    <span
                      className="text-charcoal font-semibold"
                      style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      }}
                    >
                      Events & Specials
                    </span>
                  </li>
                </ol>
              </nav>
            </AnimatedElement>

            <AnimatedElement index={1} direction="left">
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
                      ? `Found ${filteredEvents.length} ${filteredEvents.length === 1 ? 'result' : 'results'} for "${debouncedSearchQuery}"`
                      : `No results found for "${debouncedSearchQuery}"`
                    }
                  </div>
                )}
              </div>
            </AnimatedElement>

            <AnimatedElement index={2} direction="right">
              <div className="py-4 flex flex-col gap-4">
                <FilterTabs selectedFilter={selectedFilter} onFilterChange={handleFilterChange} />
                <ResultsCount count={filteredEvents.length} filterType={selectedFilter} />
              </div>
            </AnimatedElement>

            <AnimatedElement index={3} direction="bottom">
              <div className="py-4">
                {currentEvents.length > 0 ? (
                  <>
                    {/* Loading Spinner Overlay for Pagination */}
                    {isPaginationLoading && (
                      <div className="fixed inset-0 z-[9998] bg-off-white/95 backdrop-blur-sm flex items-center justify-center min-h-screen">
                        <Loader size="lg" variant="wavy" color="sage"  />
                      </div>
                    )}

                    {/* Paginated Content with Smooth Transition */}
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
                        animate={{ opacity: isPaginationLoading ? 0 : 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
                        transition={{
                          duration: 0.4,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      >
                        <EventsGrid events={currentEvents} onBookmark={handleBookmark} />
                      </motion.div>
                    </AnimatePresence>

                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      disabled={isPaginationLoading}
                    />
                  </>
                ) : (
                  <EmptyState filterType={selectedFilter} />
                )}
              </div>
            </AnimatedElement>
          </div>
        </main>
      </StaggeredContainer>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-navbar-bg hover:bg-navbar-bg backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-all duration-300"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}

          <AnimatedElement index={4} direction="bottom">
            <Footer />
          </AnimatedElement>
    </div>
  );
}
