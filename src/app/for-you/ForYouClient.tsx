"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "../components/Footer/Footer";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import { useForYouBusinesses } from "../hooks/useBusinesses";
import { useSimpleBusinessSearch } from "../hooks/useSimpleBusinessSearch";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useDebounce } from "../hooks/useDebounce";
import SearchInput from "../components/SearchInput/SearchInput";
import { FilterState } from "../components/FilterModal/FilterModal";
import ActiveFilterBadges from "../components/FilterActiveBadges/ActiveFilterBadges";
import InlineFilters from "../components/Home/InlineFilters";
import { List, Map as MapIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Loader } from "../components/Loader/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import Pagination from "../components/EventsPage/Pagination";
import BusinessGridSkeleton from "../components/Explore/BusinessGridSkeleton";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";
import type { Business } from "../components/BusinessCard/BusinessCard";
import type { UserPreferences } from "../hooks/useUserPreferences";
import type { BusinessMapItem } from "../components/maps/BusinessesMap";
import { sortBusinessesByPriority } from "../utils/businessPrioritization";
import { getCategoryLabelFromBusiness } from "../utils/subcategoryPlaceholders";
import ScrollToTopButton from "../components/Navigation/ScrollToTopButton";


// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

const BusinessesMap = dynamic(() => import("../components/maps/BusinessesMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-off-white/60 animate-pulse" />,
});

const ITEMS_PER_PAGE = 12;

type ForYouClientProps = {
  initialBusinesses: Business[];
  initialPreferences: UserPreferences;
  initialPreferencesLoaded: boolean;
  initialError?: string | null;
};

export default function ForYouClient({
  initialBusinesses,
  initialPreferences,
  initialPreferencesLoaded,
  initialError = null,
}: ForYouClientProps) {
  usePredefinedPageTitle('forYou');
  // ✅ USER PREFERENCES: From onboarding, persistent, used for personalization
  const { interests, subcategories, dealbreakers, loading: prefsLoading } = useUserPreferences({
    initialData: initialPreferences,
    skipInitialFetch: initialPreferencesLoaded,
  });
  const hasInitialBusinesses = initialBusinesses.length > 0;
  const preferences = useMemo(
    () => ({ interests, subcategories, dealbreakers }),
    [interests, subcategories, dealbreakers]
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // ✅ ACTIVE FILTERS: User-initiated, ephemeral UI state (starts empty)
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  // ✅ Track if filters were user-initiated (prevents treating preferences as filters)
  const [hasUserInitiatedFilters, setHasUserInitiatedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ minRating: null, distance: null });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const previousPageRef = useRef(currentPage);

  // Debounce search query for real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Check if search is active (2+ characters)
  const isSearchActive = debouncedSearchQuery.trim().length > 1;

  // Use simple search when query is 2+ characters
  const { results: searchResults, isSearching: simpleSearchLoading } = useSimpleBusinessSearch(
    debouncedSearchQuery,
    300
  );

  // Determine sort strategy based on search query
  const sortStrategy = useMemo((): 'relevance' | 'distance' | 'rating_desc' | 'price_asc' | 'combo' | undefined => {
    if (debouncedSearchQuery.trim().length > 0) {
      return 'relevance'; // Use relevance sorting when searching
    }
    return undefined; // Use default sorting
  }, [debouncedSearchQuery]);

  // ✅ Determine if we're in "filtered mode" (user explicitly applied filters)
  const isFiltered = useMemo(() => {
    return hasUserInitiatedFilters && (
      selectedInterestIds.length > 0 ||
      filters.minRating !== null ||
      filters.distance !== null
    );
  }, [hasUserInitiatedFilters, selectedInterestIds.length, filters.minRating, filters.distance]);

  // ✅ PREFERENCES: Used for For You personalization (separate from filters)
  const preferenceInterestIds = useMemo(() => {
    const userInterestIds = interests.map((i) => i.id).concat(
      subcategories.map((s) => s.id)
    );
    return userInterestIds.length > 0 ? userInterestIds : undefined;
  }, [interests, subcategories]);

  // ✅ ACTIVE FILTERS: Only used when user explicitly filters
  const activeInterestIds = useMemo(() => {
    // Only use selectedInterestIds if user has explicitly initiated filtering
    if (hasUserInitiatedFilters && selectedInterestIds.length > 0) {
      return selectedInterestIds;
    }
    // Otherwise, use preferences for personalization
    return preferenceInterestIds;
  }, [hasUserInitiatedFilters, selectedInterestIds, preferenceInterestIds]);

  // Convert distance string to km number
  const radiusKm = useMemo(() => {
    if (!filters.distance) return null;
    const match = filters.distance.match(/(\d+)\s*km/);
    return match ? parseInt(match[1]) : null;
  }, [filters.distance]);

  // ✅ Use useForYouBusinesses for progressive fallback strategy
  // When searching, use activeInterestIds; otherwise use preferences
  const {
    businesses,
    loading,
    error,
    refetch,
  } = useForYouBusinesses(
    120,
    debouncedSearchQuery.trim().length > 0 ? activeInterestIds : preferenceInterestIds,
    {
    sortBy: "created_at",
    sortOrder: "desc",
    feedStrategy: debouncedSearchQuery.trim().length > 0 ? "standard" : "mixed",
    minRating: filters.minRating,
    radiusKm: radiusKm,
    latitude: userLocation?.lat ?? null,
    longitude: userLocation?.lng ?? null,
    searchQuery: debouncedSearchQuery.trim().length > 0 ? debouncedSearchQuery : null,
    sort: sortStrategy,
      initialBusinesses,
      skipInitialFetch: hasInitialBusinesses,
      preferences,
      preferencesLoading: prefsLoading,
    }
  );

  const combinedError = error ?? initialError;
  const shouldShowSkeleton = !hasInitialBusinesses && (loading || prefsLoading || simpleSearchLoading);
  const canRenderResults = !simpleSearchLoading && (!prefsLoading || hasInitialBusinesses);
  const canShowError = !!combinedError && !loading && canRenderResults;

  // Note: Prioritization of recently reviewed businesses is now handled on the backend
  // The API automatically prioritizes businesses the user has reviewed within the last 24 hours

  // Apply tiered prioritization: Tier 1 (canonical + images) → Tier 2 (interest) → Tier 3 (misc)
  // This ensures well-classified businesses appear first, with Miscellaneous as discoverable long-tail
  const prioritizedBusinesses = useMemo(() => sortBusinessesByPriority(businesses), [businesses]);
  const prioritizedSearchResults = useMemo(() => sortBusinessesByPriority(searchResults), [searchResults]);

  const totalPages = useMemo(() => {
    const businessesToCount = isSearchActive ? prioritizedSearchResults : prioritizedBusinesses;
    return Math.ceil(businessesToCount.length / ITEMS_PER_PAGE);
  }, [prioritizedBusinesses.length, prioritizedSearchResults.length, isSearchActive, ITEMS_PER_PAGE]);

  const currentBusinesses = useMemo(() => {
    const businessesToPaginate = isSearchActive ? prioritizedSearchResults : prioritizedBusinesses;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return businessesToPaginate.slice(startIndex, endIndex);
  }, [prioritizedBusinesses, prioritizedSearchResults, currentPage, isSearchActive, ITEMS_PER_PAGE]);

  const totalCount = useMemo(() => {
    return isSearchActive ? prioritizedSearchResults.length : prioritizedBusinesses.length;
  }, [prioritizedBusinesses.length, prioritizedSearchResults.length, isSearchActive]);

  // Convert all businesses to map format (filter out null coords) — use lat/lng only
  // Map shows ALL businesses from the full result set, not just current page
  // Uses prioritized lists to maintain consistent ordering with list view
  const mapBusinesses = useMemo((): BusinessMapItem[] => {
    const businessesToMap = isSearchActive ? prioritizedSearchResults : prioritizedBusinesses;
    return businessesToMap
      .map((b) => {
        const lat = (b as any).lat ?? (b as any).latitude ?? null;
        const lng = (b as any).lng ?? (b as any).longitude ?? null;
        return { b, lat, lng };
      })
      .filter(({ lat, lng }) => lat != null && lng != null)
      .map(({ b, lat, lng }) => ({
        id: b.id,
        name: b.name,
        lat: lat as number,
        lng: lng as number,
        category: getCategoryLabelFromBusiness(b),
        image_url: b.image_url,
        slug: b.slug,
      }));
  }, [prioritizedBusinesses, prioritizedSearchResults, isSearchActive]);

  const handleClearFilters = () => {
    // ✅ Reset filter state - return to default mode
    setHasUserInitiatedFilters(false);
    setSelectedInterestIds([]);
    setFilters({ minRating: null, distance: null });
    setUserLocation(null);
    setCurrentPage(1);
    // Trigger refetch to clear filters immediately
    refetch();
  };

  const handleInlineDistanceChange = (distance: string) => {
    const newFilters = { ...filters, distance };
    setFilters(newFilters);
    setHasUserInitiatedFilters(true);
    setCurrentPage(1);

    // Request user location if not already available
    if (!userLocation) {
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
          }
        );
      }
    }

    // Trigger refetch immediately
    refetch();
  };

  const handleInlineRatingChange = (rating: number) => {
    const newFilters = { ...filters, minRating: rating };
    setFilters(newFilters);
    setHasUserInitiatedFilters(true);
    setCurrentPage(1);
    refetch();
  };

  const handleUpdateFilter = (filterType: 'minRating' | 'distance', value: number | string | null) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    setHasUserInitiatedFilters(true);
    setCurrentPage(1);

    // If distance filter is applied, request user location
    if (filterType === 'distance' && value && !userLocation) {
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
          }
        );
      }
    }

    // Trigger refetch immediately
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
    setCurrentPage(1); // Reset to first page
  };

  const handleToggleInterest = (interestId: string) => {
    // ✅ Mark that user has explicitly initiated filtering
    setHasUserInitiatedFilters(true);
    
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
    const updateIsDesktop = () => setIsDesktop(typeof window !== "undefined" && window.innerWidth >= 1024);
    updateIsDesktop();
    window.addEventListener("resize", updateIsDesktop);
    return () => window.removeEventListener("resize", updateIsDesktop);
  }, []);

  return (
    <div className="min-h-dvh bg-off-white">

      <main>
        <div className="mx-auto w-full max-w-[2000px] px-2">
          {/* Breadcrumb */}
          <nav className="py-1" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Home
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 text-charcoal/60" />
              </li>
              <li>
                <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  For You
                </span>
              </li>
            </ol>
          </nav>

          {/* Title and Description Block */}
          <div className="mb-6 sm:mb-8 px-4 sm:px-6 text-center pt-4">
            <div className="my-4">
              <h1 
                className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-700 leading-[1.2] tracking-tight text-charcoal mx-auto"
                style={{ 
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  fontWeight: 700,
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  hyphens: 'none',
                }}
              >
                <WavyTypedTitle
                  text="Curated Just For You"
                  as="span"
                  className="inline-block"
                  typingSpeedMs={50}
                  startDelayMs={200}
                  disableWave={true}
                  enableScrollTrigger={true}
                  style={{
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    fontWeight: 700,
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                    whiteSpace: 'normal',
                    hyphens: 'none',
                  }}
                />
              </h1>
            </div>
            <p className="text-sm sm:text-base text-charcoal/70 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Discover personalised recommendations tailored to your interests and preferences. 
              We've handpicked the best local businesses just for you.
            </p>
            {prefsLoading && hasInitialBusinesses && (
              <div
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs text-charcoal/70 shadow-sm border border-sage/20"
                aria-live="polite"
              >
                <span
                  className="inline-block h-3 w-3 animate-spin rounded-full border border-charcoal/30 border-t-transparent"
                  aria-hidden
                />
                <span>Personalizing...</span>
              </div>
            )}
          </div>

          {/* Search Input at top of main content */}
          <div ref={searchWrapRef} className="py-3 sm:py-4 px-4">
            <SearchInput
              variant="header"
              placeholder="Discover exceptional local hidden gems..."
              mobilePlaceholder="Search places, coffee, yoga…"
              onSearch={handleSearchChange}
              onSubmitQuery={handleSubmitQuery}
              showFilter={false}
              enableSuggestions={true}
            />
          </div>

          {/* Inline Filters - Only show when searching */}
          <InlineFilters
            show={isSearchActive && debouncedSearchQuery.trim().length > 0}
            filters={filters}
            onDistanceChange={handleInlineDistanceChange}
            onRatingChange={handleInlineRatingChange}
          />

          {/* Active Filter Badges - Show when filters are active */}
          <ActiveFilterBadges
            filters={filters}
            onRemoveFilter={(filterType) => {
              const newFilters = { ...filters, [filterType]: null };
              setFilters(newFilters);
              refetch();
            }}
            onUpdateFilter={handleUpdateFilter}
            onClearAll={handleClearFilters}
          />

          <div className="py-3 sm:py-4">
            <div className="pt-4 sm:pt-6 md:pt-10">
          {/* ✅ Show skeleton loader while prefs are loading OR businesses are loading OR simple search is loading */}
          {shouldShowSkeleton && (
            <BusinessGridSkeleton />
          )}
          {canShowError && (
            <div className="bg-white border border-sage/20 rounded-3xl shadow-sm px-6 py-10 text-center space-y-4">
              <p className="text-charcoal font-semibold text-h2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                We couldn't load businesses right now.
              </p>
              <p className="text-body-sm text-charcoal/60 max-w-[70ch]" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                {combinedError}
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

          {canRenderResults && !combinedError && (
            <>
              {totalCount === 0 ? (
                isSearchActive ? (
                  /* Search empty state - matches home page style */
                  <div className="w-full sm:max-w-md lg:max-w-lg xl:max-w-xl sm:mx-auto relative z-10">
                    <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 text-center space-y-4">
                      <h2 className="text-h2 font-semibold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        No results found
                      </h2>
                      <p className="text-body-sm text-white/80 max-w-[70ch] mx-auto leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
                        We couldn't find any businesses matching "{debouncedSearchQuery}". Try adjusting your search or check back soon.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Default empty state for filters/personalization */
                  <div className="bg-white border border-sage/20 rounded-3xl shadow-md px-6 py-16 text-center space-y-3">
                    <h2 className="text-h2 font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      {isFiltered ? 'No businesses match your filters' : 'Curated from your interests'}
                    </h2>
                    <p className="text-body-sm text-charcoal/60 max-w-[70ch] mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                      {isFiltered
                        ? 'Try adjusting your filters or check back soon as new businesses join the community.'
                        : 'No matches in your selected categories yet. Adjust your interests or check back as more businesses join.'}
                    </p>
                  </div>
                )
              ) : (
                <>
                  {/* Search Results Header */}
                  {isSearchActive && totalCount > 0 && (
                    <div className="mb-4 px-2 flex items-center justify-between">
                      <div className="text-sm text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Found {totalCount} {totalCount === 1 ? 'result' : 'results'} for "{debouncedSearchQuery}"
                      </div>
                    </div>
                  )}

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
                        className="w-full h-[calc(100vh-300px)] min-h-[500px] rounded-[12px] overflow-hidden border border-white/30 shadow-lg"
                      >
                        <BusinessesMap
                          businesses={mapBusinesses}
                          className="w-full h-full"
                        />
                      </motion.div>
                    ) : (
                      isDesktop ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 justify-items-center">
                          {currentBusinesses.map((business) => (
                            <div
                              key={business.id}
                              className="list-none relative overflow-hidden desktop-card-shimmer w-full flex justify-center"
                            >
                              <span aria-hidden className="desktop-shimmer-veil" />
                              <div className="md:hidden w-full">
                                <BusinessCard business={business} compact />
                              </div>
                              <div className="hidden md:block">
                                <BusinessCard business={business} compact />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 justify-items-center">
                            {currentBusinesses.map((business, index) => (
                              <motion.div
                                key={business.id}
                                className="list-none w-full flex justify-center"
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                  type: "spring",
                                  damping: 25,
                                  stiffness: 200,
                                  delay: index * 0.06 + 0.1,
                                }}
                              >
                                <div className="md:hidden w-full">
                                  <BusinessCard business={business} compact />
                                </div>
                                <div className="hidden md:block">
                                  <BusinessCard business={business} compact />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>

                  {/* Pagination - Only show in list mode */}
                  {!isMapMode && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      disabled={isPaginationLoading}
                    />
                  )}
                </>
              )}
            </>
          )}
            </div>
          </div>
        </div>
      </main>

      {isDesktop && (
        <style jsx>{`
          .desktop-card-shimmer {
            position: relative;
          }
          .desktop-card-shimmer .desktop-shimmer-veil {
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

      <ScrollToTopButton threshold={360} />

      <Footer />
    </div>
  );
}

