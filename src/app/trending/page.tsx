"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Fontdiner_Swanky } from "next/font/google";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import Footer from "../components/Footer/Footer";
import Header from "../components/Header/Header";
import { ChevronRight, ChevronUp } from "react-feather";
import Pagination from "../components/EventsPage/Pagination";
import { useBusinesses } from "../hooks/useBusinesses";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useDebounce } from "../hooks/useDebounce";
import SearchInput from "../components/SearchInput/SearchInput";
import FilterModal, { FilterState } from "../components/FilterModal/FilterModal";
import ActiveFilterBadges from "../components/FilterActiveBadges/ActiveFilterBadges";
import SearchResultsMap from "../components/BusinessMap/SearchResultsMap";
import { List, Map as MapIcon } from "react-feather";
import { Loader } from "../components/Loader/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import CategoryFilterPills from "../components/Home/CategoryFilterPills";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

const ITEMS_PER_PAGE = 12;

export default function TrendingPage() {
  usePredefinedPageTitle('trending');
  const [currentPage, setCurrentPage] = useState(1);
  // ✅ USER PREFERENCES: From onboarding, persistent, used for visual highlighting only
  const { interests, subcategories, dealbreakers, loading: prefsLoading } = useUserPreferences();

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

  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // ✅ ACTIVE FILTERS: User-initiated, ephemeral UI state (starts empty)
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  // ✅ Track if filters were user-initiated (prevents treating preferences as filters)
  const [hasUserInitiatedFilters, setHasUserInitiatedFilters] = useState(false);
  // ✅ Fallback: if strict trending returns 0, broaden automatically
  const [useBroadTrending, setUseBroadTrending] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ minRating: null, distance: null });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const previousPageRef = useRef(currentPage);

  // Debounce search query for real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Convert distance string to km number
  const radiusKm = useMemo(() => {
    if (!filters.distance) return null;
    const match = filters.distance.match(/(\d+)\s*km/);
    return match ? parseInt(match[1]) : null;
  }, [filters.distance]);

  // Determine sort strategy based on search query
  const sortStrategy = useMemo((): 'relevance' | 'distance' | 'rating_desc' | 'price_asc' | 'combo' | undefined => {
    if (debouncedSearchQuery.trim().length > 0) {
      return 'relevance'; // Use relevance sorting when searching
    }
    return undefined; // Use default sorting
  }, [debouncedSearchQuery]);

  // ✅ PREFERENCES: Used for visual highlighting only (separate from filters)
  const preferredCategoryIds = useMemo(
    () => (interests || []).map((i) => i.id).concat((subcategories || []).map((s) => s.id)),
    [interests, subcategories]
  );

  // ✅ ACTIVE FILTERS: Only used when user explicitly filters
  const activeInterestIds = useMemo(() => {
    // Only filter trending by interests if user explicitly chose filters
    if (hasUserInitiatedFilters && selectedInterestIds.length > 0) return selectedInterestIds;
    return undefined; // ✅ global trending default
  }, [hasUserInitiatedFilters, selectedInterestIds]);

  // ✅ Only apply dealbreakers/priceRanges when user initiated AND not in broad fallback mode
  const activeDealbreakerIds = useMemo(() => {
    if (!hasUserInitiatedFilters || useBroadTrending) return undefined;
    return dealbreakerIds.length ? dealbreakerIds : undefined;
  }, [hasUserInitiatedFilters, useBroadTrending, dealbreakerIds]);

  const activePriceRanges = useMemo(() => {
    if (!hasUserInitiatedFilters || useBroadTrending) return undefined;
    return preferredPriceRanges;
  }, [hasUserInitiatedFilters, useBroadTrending, preferredPriceRanges]);

  const { businesses: trendingBusinesses, loading, error, refetch } = useBusinesses({
    limit: 50,
    sortBy: "total_rating",
    sortOrder: "desc",
    feedStrategy: debouncedSearchQuery.trim().length > 0 ? "standard" : "mixed",
    // ✅ Trending: only filter by interestIds if user initiated filters
    interestIds:
      debouncedSearchQuery.trim().length > 0
        ? undefined
        : useBroadTrending
          ? undefined
          : activeInterestIds,
    // ✅ Only apply these when user initiated AND not in broad fallback mode
    priceRanges: activePriceRanges,
    dealbreakerIds: activeDealbreakerIds,
    minRating: filters.minRating,
    radiusKm: radiusKm,
    latitude: userLocation?.lat ?? null,
    longitude: userLocation?.lng ?? null,
    searchQuery: debouncedSearchQuery.trim().length > 0 ? debouncedSearchQuery : null,
    sort: sortStrategy,
    skip: prefsLoading, // ✅ Wait for prefs to be ready
  });

  // Trending section should be consistent for all users based on actual trending metrics
  // No personal prioritization here - keep original order from API

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
    // ✅ Mark that user has explicitly initiated filtering
    setHasUserInitiatedFilters(true);
    setUseBroadTrending(false); // Reset fallback when user changes filters
    setFilters(f);
    setCurrentPage(1); // Reset to first page when filters change
    closeFilters();
    
    // If distance filter is applied, request user location
    if (f.distance && !userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.warn('Error getting user location:', error);
            // Continue without location - distance filter won't work but other filters will
          }
        );
      }
    }
    
    // Trigger refetch to apply filters immediately
    refetch();
  };

  const handleClearFilters = () => {
    // ✅ Reset filter state - return to default mode
    setHasUserInitiatedFilters(false);
    setUseBroadTrending(false);
    setSelectedInterestIds([]);
    setFilters({ minRating: null, distance: null });
    setUserLocation(null);
    setCurrentPage(1);
    // Trigger refetch to clear filters immediately
    refetch();
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Reset to first page when search changes
    if (query !== debouncedSearchQuery) {
      setCurrentPage(1);
    }
  };

  const handleSubmitQuery = (query: string) => {
    setSearchQuery(query);
    setIsMapMode(false); // Reset to list view when new search
    setCurrentPage(1); // Reset to first page
    if (isFilterVisible) closeFilters();
  };

  const handleToggleInterest = (interestId: string) => {
    // ✅ Mark that user has explicitly initiated filtering
    setHasUserInitiatedFilters(true);
    setUseBroadTrending(false); // Reset fallback when user changes filters
    
    setSelectedInterestIds(prev => {
      const newIds = prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId];
      
      // Immediately trigger refetch when category changes
      setTimeout(() => {
        refetch();
      }, 0);
      
      return newIds;
    });
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Set mounted state on client side
  useEffect(() => {
    setMounted(true);
    // Check initial scroll position
    if (typeof window !== 'undefined') {
      setShowScrollTop(window.scrollY > 100);
    }
  }, []);

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
    if (!mounted) return;

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };

    // Check initial position
    handleScroll();

    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener("scroll", handleScroll, options);
    return () => window.removeEventListener("scroll", handleScroll, options);
  }, [mounted]);

  // ✅ Auto-fallback if strict trending returns 0 (no infinite loop)
  useEffect(() => {
    if (loading || error || prefsLoading) return;
    if (debouncedSearchQuery.trim().length > 0) return;

    const hadStrictConstraints =
      (hasUserInitiatedFilters && (selectedInterestIds.length > 0 || dealbreakerIds.length > 0)) ||
      !!preferredPriceRanges ||
      filters.minRating !== null ||
      filters.distance !== null;

    // If strict returns empty, broaden once
    if (!useBroadTrending && hadStrictConstraints && trendingBusinesses.length === 0) {
      console.log('[TrendingPage] Strict filtering returned 0 results, falling back to broad trending');
      setUseBroadTrending(true);
    }
  }, [
    loading,
    error,
    prefsLoading,
    trendingBusinesses.length,
    debouncedSearchQuery,
    hasUserInitiatedFilters,
    selectedInterestIds.length,
    dealbreakerIds.length,
    preferredPriceRanges,
    filters.minRating,
    filters.distance,
    useBroadTrending,
  ]);

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
        <div className="mx-auto w-full max-w-[2000px] px-2">
          {/* Breadcrumb */}
          <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Home
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 text-charcoal/40" />
              </li>
              <li>
                <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Trending
                </span>
              </li>
            </ol>
          </nav>

          {/* Title and Description Block */}
          <div className="mb-6 sm:mb-8 px-4 sm:px-6 text-center pt-4">
            <div className="my-4">
              <h1 
                className={`${swanky.className} text-2xl sm:text-3xl md:text-4xl font-semibold leading-[1.2] tracking-tight text-charcoal mx-auto`}
                style={{ 
                  fontFamily: swanky.style.fontFamily,
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  hyphens: 'none',
                }}
              >
                <WavyTypedTitle
                  text="Trending Now"
                  as="span"
                  className="inline-block"
                  typingSpeedMs={50}
                  startDelayMs={200}
                  waveVariant="subtle"
                  loopWave={true}
                  enableScrollTrigger={true}
                  style={{
                    fontFamily: swanky.style.fontFamily,
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                    whiteSpace: 'normal',
                    hyphens: 'none',
                  }}
                />
              </h1>
            </div>
            <p className="text-sm sm:text-base text-charcoal/70 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              See what's hot right now! Explore the most popular and highly-rated businesses 
              that everyone's talking about in your area.
            </p>
          </div>

          {/* Search Input */}
          <div ref={searchWrapRef} className="py-3 sm:py-4 px-4">
            <SearchInput
              variant="header"
              placeholder="Search trending businesses..."
              mobilePlaceholder="Search trending..."
              onSearch={handleSearchChange}
              onSubmitQuery={handleSubmitQuery}
              onFilterClick={openFilters}
              onFocusOpenFilters={openFilters}
              showFilter
            />
          </div>

          {/* Category Filter Pills - positioned directly underneath search input */}
          <div className="py-4 px-4">
            <CategoryFilterPills
              selectedCategoryIds={selectedInterestIds}
              preferredCategoryIds={preferredCategoryIds}
              onToggleCategory={handleToggleInterest}
            />
          </div>

          {/* Active Filter Badges */}
          <ActiveFilterBadges
            filters={filters}
            onRemoveFilter={(filterType) => {
              const newFilters = { ...filters, [filterType]: null };
              setFilters(newFilters);
              refetch();
            }}
            onClearAll={handleClearFilters}
          />

          <div className="py-3 sm:py-4">
            <div className="pt-4 sm:pt-6 md:pt-10">
            {/* ✅ Show loading while prefs are loading OR businesses are loading */}
            {(loading || prefsLoading) && (
              <div className="min-h-dvh bg-off-white flex items-center justify-center">
                <Loader size="lg" variant="wavy" color="sage"  />
              </div>
            )}
            {!loading && !prefsLoading && error && (
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

            {!loading && !prefsLoading && !error && (
              <>
                {trendingBusinesses.length === 0 ? (
                  <div className="bg-white border border-sage/20 rounded-3xl shadow-sm px-6 py-16 text-center space-y-3">
                    <h2 className="text-h2 font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      {hasUserInitiatedFilters ? 'No trending businesses match your filters' : 'No trending businesses yet'}
                    </h2>
                    <p className="text-body-sm text-charcoal/60 max-w-[70ch] mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                      {hasUserInitiatedFilters 
                        ? 'Try adjusting your filters or check back soon as new businesses join the community.'
                        : 'Check back soon for trending businesses in your area.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Loading Spinner Overlay for Pagination */}
                    {isPaginationLoading && (
                      <div className="fixed inset-0 z-[9998] bg-off-white/95 backdrop-blur-sm flex items-center justify-center min-h-screen">
                        <Loader size="lg" variant="wavy" color="sage"  />
                      </div>
                    )}

                    {/* List | Map Toggle */}
                    <div className="mb-4 px-2 flex items-center justify-end">
                      <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-full p-1 border border-white/30 shadow-sm">
                        <button
                          onClick={() => setIsMapMode(false)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            !isMapMode
                              ? 'bg-sage text-white shadow-sm'
                              : 'text-charcoal/70 hover:text-charcoal'
                          }`}
                          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                          <List className="w-3.5 h-3.5" />
                          List
                        </button>
                        <button
                          onClick={() => setIsMapMode(true)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isMapMode
                              ? 'bg-coral text-white shadow-sm'
                              : 'text-charcoal/70 hover:text-charcoal'
                          }`}
                          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                          <MapIcon className="w-3.5 h-3.5" />
                          Map
                        </button>
                      </div>
                    </div>

                    {/* Paginated Content with Smooth Transition - Map or List */}
                    <AnimatePresence mode="wait" initial={false}>
                      {isMapMode ? (
                        <motion.div
                          key="map-view"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="w-full h-[calc(100vh-300px)] min-h-[500px] rounded-[20px] overflow-hidden border border-white/30 shadow-lg"
                        >
                          <SearchResultsMap
                            businesses={trendingBusinesses}
                            userLocation={userLocation}
                            onBusinessClick={(business) => {
                              window.location.href = `/business/${business.slug || business.id}`;
                            }}
                          />
                        </motion.div>
                      ) : (
                        <div
                          key={`list-view-${currentPage}`}
                          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-3"
                        >
                          {currentBusinesses.map((business) => (
                            <div key={business.id} className="list-none">
                              <BusinessCard business={business} compact />
                            </div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Pagination */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      disabled={isPaginationLoading}
                    />
                  </>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      </main>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        isVisible={isFilterVisible}
        onClose={closeFilters}
        onApplyFilters={handleApplyFilters}
        onClearAll={handleClearFilters}
        anchorRef={searchWrapRef}
        initialFilters={filters}
      />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-navbar-bg hover:bg-navbar-bg backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:scale-110 transition-all duration-300"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}

      <Footer />
    </div>
  );
}
