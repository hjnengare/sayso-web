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
import { ChevronUp, Search } from "react-feather";
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

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return EVENTS_AND_SPECIALS.filter((event) => {
      const matchesFilter = selectedFilter === "all" || event.type === selectedFilter;
      const matchesQuery =
        query.length === 0 ||
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [selectedFilter, searchQuery]);

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
        showSearch={false}
        backgroundClassName="bg-navbar-bg"
        topPosition="top-0"
        reducedPadding
        whiteText
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
              <nav className="px-2" aria-label="Breadcrumb">
                <ol className="flex items-center gap-1 text-body-sm text-charcoal/60">
                  <li>
                    <Link
                      href="/home"
                      className="hover:text-charcoal transition-colors"
                      style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        fontWeight: 600,
                      }}
                    >
                      Home
                    </Link>
                  </li>
                  <li className="text-charcoal/40">/</li>
                  <li
                    className="text-charcoal font-medium"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      fontWeight: 600,
                    }}
                  >
                    Events & Specials
                  </li>
                </ol>
              </nav>
            </AnimatedElement>

            <AnimatedElement index={1} direction="left">
              <div className="py-4 relative">
                <SearchInput
                  variant="header"
                  placeholder="Search events and limited-time offers..."
                  mobilePlaceholder="Search events & specials..."
                  onSearch={handleSearch}
                  showFilter={false}
                />
                <button
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-charcoal/60 hover:text-charcoal transition-colors z-10"
                  aria-label="Search"
                  title="Search"
                >
                  <Search className="w-5 h-5" strokeWidth={2} />
                </button>
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
                        <Loader size="lg" variant="pulse" color="sage"  />
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
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-navbar-bg/90 hover:bg-navbar-bg backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-all duration-300"
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
