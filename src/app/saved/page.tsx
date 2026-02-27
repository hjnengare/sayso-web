"use client";

import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSavedBusinesses } from "../hooks/useSavedBusinessesFull";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { getChoreoItemMotion } from "../lib/motion/choreography";
import { ChevronRight, Store } from "lucide-react";
import Pagination from "../components/EventsPage/Pagination";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import { useSavedItems } from "../contexts/SavedItemsContext";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import EmptySavedState from "../components/Saved/EmptySavedState";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { Business } from "../components/BusinessCard/BusinessCard";
import BusinessGridSkeleton from "../components/Explore/BusinessGridSkeleton";

const ITEMS_PER_PAGE = 12;

const Footer = nextDynamic(() => import("../components/Footer/Footer"), {
  loading: () => null,
  ssr: false,
});

function SavedPageSkeleton({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <div className="relative z-10">
      <div className="mx-auto w-full max-w-[2000px] px-2">
        {showHeader && (
          <div className="mb-6 sm:mb-8 px-2 animate-pulse">
            <div className="h-9 w-56 rounded-lg bg-charcoal/10" />
            <div className="mt-3 h-4 w-40 rounded bg-charcoal/10" />
          </div>
        )}

        <div className="mb-6 px-2 animate-pulse">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="h-8 w-16 rounded-full bg-charcoal/10 shrink-0" />
            <div className="h-8 w-20 rounded-full bg-charcoal/10 shrink-0" />
            <div className="h-8 w-24 rounded-full bg-charcoal/10 shrink-0" />
            <div className="h-8 w-20 rounded-full bg-charcoal/10 shrink-0" />
          </div>
        </div>

        <BusinessGridSkeleton />
      </div>
    </div>
  );
}


export default function SavedPage() {
  usePredefinedPageTitle("saved");
  const prefersReducedMotion = useReducedMotion() ?? false;
  const choreoEnabled = !prefersReducedMotion;
  const { savedItems, isLoading: savedItemsLoading, refetch: refetchBusinesses } = useSavedItems();

  // SWR-backed saved businesses list
  const { businesses: savedBusinesses, loading: isLoadingBusinesses, error } = useSavedBusinesses();

  const [currentPage, setCurrentPage] = useState(1);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const previousPageRef = useRef(currentPage);

  // Extract unique categories from saved businesses
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(savedBusinesses.map(b => b.category).filter(Boolean))
    ).sort();
    return ['All', ...uniqueCategories];
  }, [savedBusinesses]);

  // Filter businesses by selected category
  const filteredBusinesses = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') {
      return savedBusinesses;
    }
    return savedBusinesses.filter(b => b.category === selectedCategory);
  }, [savedBusinesses, selectedCategory]);

  // Calculate pagination based on active tab
  const currentItems = useMemo(() => {
    return filteredBusinesses;
  }, [filteredBusinesses]);

  const totalPages = useMemo(
    () => Math.ceil(currentItems.length / ITEMS_PER_PAGE),
    [currentItems.length]
  );

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return currentItems.slice(startIndex, endIndex);
  }, [currentItems, currentPage]);

  // Reset to page 1 when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);



  // Handle pagination with loader and transitions
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;

    setIsPaginationLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => {
      previousPageRef.current = currentPage;
      setCurrentPage(newPage);

      setTimeout(() => {
        setIsPaginationLoading(false);
      }, 300);
    }, 150);
  };

  // Handle scroll to top button visibility
  // (Scroll-to-top is handled globally; no local button needed on saved page.)

  const handleRefetch = () => {
    refetchBusinesses();
  };

  const isLoading = isLoadingBusinesses || savedItemsLoading;
  const hasAnyContent = savedBusinesses.length > 0;
  const totalSavedCount = savedBusinesses.length;

  return (
    <EmailVerificationGuard>
      <div
        className="min-h-[100dvh] flex flex-col bg-off-white relative font-urbanist"
        style={{
          fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

        <main className="min-h-[100dvh] flex-1 relative z-10">
          <div className="min-h-[100dvh] pb-12 sm:pb-16 md:pb-20">
            <m.div
              className="mx-auto w-full max-w-[2000px] px-2 relative"
              {...getChoreoItemMotion({ order: 0, intent: "inline", enabled: choreoEnabled })}
            >
              {/* Breadcrumb Navigation */}
              <nav className="pb-1" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm sm:text-base">
                  <li>
                    <Link
                      href="/home"
                      className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                      style={{
                        fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Home
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full text-charcoal/85 transition duration-200 ease-out hover:scale-[1.03] align-middle">
                      <ChevronRight className="w-4 h-4" aria-hidden />
                    </span>
                  </li>
                  <li>
                    <span className="text-charcoal font-semibold" style={{
                      fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}>
                      Saved
                    </span>
                  </li>
                </ol>
              </nav>
            </m.div>

            {isLoading ? (
              <SavedPageSkeleton />
            ) : error ? (
              <m.div
                className="min-h-[100dvh] pt-4 relative z-10 flex items-center justify-center"
                {...getChoreoItemMotion({ order: 1, intent: "section", enabled: choreoEnabled })}
              >
                <div className="text-center max-w-md mx-auto px-4">
                  <p
                    className="text-body text-charcoal/70 mb-4"
                    style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                  >
                    {error}
                  </p>
                  <button
                    onClick={handleRefetch}
                    className="px-6 py-3 bg-card-bg text-white rounded-full text-body font-semibold hover:bg-card-bg/90 transition-colors"
                    style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                  >
                    Try Again
                  </button>
                </div>
              </m.div>
            ) : hasAnyContent ? (
              <m.div
                className="relative z-10 min-h-[100dvh]"
                {...getChoreoItemMotion({ order: 1, intent: "section", enabled: choreoEnabled })}
              >
                <div className="mx-auto w-full max-w-[2000px] px-2">
                  {/* Title */}
                  <m.div
                    className="mb-6 sm:mb-8 px-2"
                    {...getChoreoItemMotion({ order: 2, intent: "heading", enabled: choreoEnabled })}
                  >
                    <h1
                      className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal"
                      style={{
                        fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        fontWeight: 800,
                      }}
                    >
                      Your Saved Gems
                    </h1>
                    <p
                      className="text-body-sm text-charcoal/60 mt-2"
                      style={{
                        fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      {totalSavedCount} {totalSavedCount === 1 ? "item" : "items"} saved
                    </p>
                  </m.div>

                  {/* Category Filters */}
                  {categories.length > 1 && (
                    <m.div
                      className="mb-6 px-2"
                      {...getChoreoItemMotion({ order: 3, intent: "section", enabled: choreoEnabled })}
                    >
                      <div
                        className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2"
                        style={{
                          WebkitOverflowScrolling: 'touch',
                          scrollBehavior: 'smooth',
                        }}
                      >
                        {categories.map((category) => {
                          const isSelected = selectedCategory === category || (!selectedCategory && category === 'All');
                          const count = category === 'All'
                            ? savedBusinesses.length
                            : savedBusinesses.filter(b => b.category === category).length;

                          return (
                            <button
                              key={category}
                              onClick={() => setSelectedCategory(category === 'All' ? null : category)}
                              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-urbanist font-500 text-xs sm:text-sm transition-all duration-200 active:scale-95 flex-shrink-0 whitespace-nowrap ${
                                isSelected
                                  ? "bg-card-bg text-white"
                                  : "bg-white/50 text-charcoal/60 hover:bg-card-bg/10 hover:text-charcoal border border-charcoal/10"
                              }`}
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                              {category}
                              {count > 0 && (
                                <span className="ml-1 opacity-80">
                                  ({count})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </m.div>
                  )}

                  {/* Loading Spinner Overlay for Pagination */}
                  {isPaginationLoading && (
                    <div className="fixed inset-0 z-[9998] bg-off-white/92 backdrop-blur-sm overflow-y-auto">
                      <div className="pt-24 pb-10">
                        <SavedPageSkeleton showHeader={false} />
                      </div>
                    </div>
                  )}

                  {/* Content Grid */}
                  <AnimatePresence mode="wait" initial={false}>
                    {filteredBusinesses.length > 0 ? (
                      <m.div
                        key={`businesses-${currentPage}`}
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-3"
                        {...getChoreoItemMotion({ order: 4, intent: "section", enabled: choreoEnabled })}
                      >
                        {(paginatedItems as Business[]).map((business) => (
                          <div key={business.id} className="list-none">
                            <BusinessCard business={business} compact inGrid={true} />
                          </div>
                        ))}
                      </m.div>
                    ) : (
                      <div className="text-center py-12">
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-off-white/70 text-charcoal/85 transition duration-200 ease-out hover:bg-off-white/90 hover:scale-[1.03]">
                          <Store className="w-6 h-6" aria-hidden />
                        </span>
                        <p className="text-charcoal/60 text-body" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                          No saved businesses yet
                        </p>
                        <Link
                          href="/home"
                          className="inline-block mt-4 px-6 py-2 bg-card-bg text-white rounded-full text-sm font-medium hover:bg-card-bg/90 transition-colors"
                        >
                          Explore Businesses
                        </Link>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Pagination */}
                  {currentItems.length > ITEMS_PER_PAGE && (
                    <m.div
                      {...getChoreoItemMotion({ order: 5, intent: "section", enabled: choreoEnabled })}
                    >
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        disabled={isPaginationLoading}
                      />
                    </m.div>
                  )}
                </div>
              </m.div>
            ) : (
              <m.div
                className="relative z-10 min-h-[100dvh] flex items-center justify-center"
                {...getChoreoItemMotion({ order: 1, intent: "section", enabled: choreoEnabled })}
              >
                <EmptySavedState />
              </m.div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </EmailVerificationGuard>
  );
}
