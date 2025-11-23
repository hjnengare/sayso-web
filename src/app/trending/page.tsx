"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import Footer from "../components/Footer/Footer";
import Header from "../components/Header/Header";
import { ChevronLeft, ChevronRight, ChevronUp } from "react-feather";
import { useTrendingBusinesses } from "../hooks/useBusinesses";
import { useUserPreferences } from "../hooks/useUserPreferences";
import SearchInput from "../components/SearchInput/SearchInput";
import FilterModal, { FilterState } from "../components/FilterModal/FilterModal";
import { Loader } from "../components/Loader/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";

// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

const ITEMS_PER_PAGE = 12;

export default function TrendingPage() {
  usePredefinedPageTitle('trending');
  const [currentPage, setCurrentPage] = useState(1);
  const { interests, subcategories, dealbreakers } = useUserPreferences();

  const dealbreakerIds = useMemo(
    () => (dealbreakers || []).map((dealbreaker) => dealbreaker.id),
    [dealbreakers]
  );

  const preferredPriceRanges = useMemo(() => {
    if (dealbreakerIds.includes("value-for-money")) {
      return ["$", "$$"];
    }
    return undefined;
  }, [dealbreakerIds]);

  const { businesses: trendingBusinesses, loading, error, refetch } = useTrendingBusinesses(50, {
    priceRanges: preferredPriceRanges,
    dealbreakerIds: dealbreakerIds.length ? dealbreakerIds : undefined,
  });

  // Trending section should be consistent for all users based on actual trending metrics
  // No personal prioritization here - keep original order from API

  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const previousPageRef = useRef(currentPage);

  const totalPages = useMemo(() => Math.ceil(trendingBusinesses.length / ITEMS_PER_PAGE), [trendingBusinesses.length]);
  const currentBusinesses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return trendingBusinesses.slice(startIndex, endIndex);
  }, [trendingBusinesses, currentPage]);

  const openFilters = () => {
    if (isFilterVisible) return;
    setIsFilterVisible(true);
    setTimeout(() => setIsFilterOpen(true), 10);
  };

  const closeFilters = () => {
    setIsFilterOpen(false);
    setTimeout(() => setIsFilterVisible(false), 150);
  };

  const handleApplyFilters = (f: FilterState) => {
    console.log("filters:", f);
  };

  const handleSubmitQuery = (query: string) => {
    console.log("submit query:", query);
    if (isFilterVisible) closeFilters();
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

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };

    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener("scroll", handleScroll, options);
    return () => window.removeEventListener("scroll", handleScroll, options);
  }, []);

  return (
    <div className="min-h-dvh bg-off-white">
      {/* Header */}
      <Header
        showSearch={true}
        variant="white"
        backgroundClassName="bg-navbar-bg"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />

      <main className="pt-20 sm:pt-24 pb-28">
        <div className="mx-auto w-full max-w-[2000px] px-2 pt-2 sm:pt-4">
          {/* Breadcrumb */}
          <nav className="px-2" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-body-sm text-charcoal/60">
              <li>
                <Link href="/home" className="hover:text-charcoal transition-colors" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                  Home
                </Link>
              </li>
              <li className="text-charcoal/40">/</li>
              <li className="text-charcoal font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Trending</li>
            </ol>
          </nav>

          {/* Search Input */}
          <div ref={searchWrapRef} className="py-4">
            <SearchInput
              variant="header"
              placeholder="Search trending businesses..."
              mobilePlaceholder="Search trending..."
              onSearch={(q) => console.log("search change:", q)}
              onSubmitQuery={handleSubmitQuery}
              onFilterClick={openFilters}
              onFocusOpenFilters={openFilters}
              showFilter
            />
          </div>

          <div className="py-4">
            {!loading && error && (
              <div className="bg-white border border-sage/20 rounded-3xl shadow-sm px-6 py-10 text-center space-y-4">
                <p className="text-charcoal font-semibold text-h2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  We couldn't load businesses right now.
                </p>
                <p className="text-body-sm text-charcoal/60 max-w-[70ch]" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                  {error}
                </p>
                <button
                  onClick={refetch}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-sage text-white hover:bg-sage/90 transition-colors text-body font-semibold"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && (
              <>
                {trendingBusinesses.length === 0 ? (
                  <div className="bg-white border border-sage/20 rounded-3xl shadow-sm px-6 py-16 text-center space-y-3">
                    <h2 className="text-h2 font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      No trending businesses yet
                    </h2>
                    <p className="text-body-sm text-charcoal/60 max-w-[70ch] mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                      Check back soon for trending businesses in your area.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Loading Spinner Overlay for Pagination */}
                    {isPaginationLoading && (
                      <div className="fixed inset-0 z-[9998] bg-off-white/95 backdrop-blur-sm flex items-center justify-center min-h-screen">
                        <Loader size="lg" variant="spinner" color="sage" />
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
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3"
                      >
                        {currentBusinesses.map((business) => (
                          <div key={business.id} className="list-none">
                            <BusinessCard business={business} compact={true} />
                          </div>
                        ))}
                      </motion.div>
                    </AnimatePresence>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-12">
                        <button
                          onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                          disabled={currentPage === 1 || isPaginationLoading}
                          className="w-10 h-10 rounded-full bg-navbar-bg/90 border border-charcoal/20 flex items-center justify-center hover:bg-navbar-bg/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                          aria-label="Previous page"
                          title="Previous"
                        >
                          <ChevronLeft className="text-white" size={20} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            disabled={isPaginationLoading}
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                            className={`w-10 h-10 rounded-full bg-navbar-bg/90 font-semibold text-body-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                              currentPage === page
                                ? "bg-sage text-white shadow-lg"
                                : "border border-charcoal/20 text-white hover:bg-navbar-bg/80"
                            }`}
                            aria-current={currentPage === page ? "page" : undefined}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                          disabled={currentPage === totalPages || isPaginationLoading}
                          className="w-10 h-10 rounded-full bg-navbar-bg/90 border border-charcoal/20 flex items-center justify-center hover:bg-navbar-bg/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                          aria-label="Next page"
                          title="Next"
                        >
                          <ChevronRight className="text-white" size={20} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        isVisible={isFilterVisible}
        onClose={closeFilters}
        onApplyFilters={handleApplyFilters}
        anchorRef={searchWrapRef}
      />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-navbar-bg/90 hover:bg-navbar-bg backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:scale-110 transition-all duration-300"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}

      <Footer />
    </div>
  );
}
