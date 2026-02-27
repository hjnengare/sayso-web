"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, m } from "framer-motion";
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
import { ChevronRight, ChevronLeft } from "lucide-react";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import Pagination from "../components/EventsPage/Pagination";
import BusinessGridSkeleton from "../components/Explore/BusinessGridSkeleton";
import type { Business } from "../components/BusinessCard/BusinessCard";
import type { UserPreferences } from "../hooks/useUserPreferences";
import type { BusinessMapItem } from "../components/maps/BusinessesMap";
import { sortBusinessesByPriority } from "../utils/businessPrioritization";
import { getCategoryLabelFromBusiness } from "../utils/subcategoryPlaceholders";
import { useIsDesktop as useIsDesktopHook } from "../hooks/useIsDesktop";


// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

// Animation variants for staggered card appearance - optimized for performance
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const BusinessesMap = dynamic(() => import("../components/maps/BusinessesMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-off-white/60 animate-pulse" />,
});

const ITEMS_PER_PAGE = 12;

function ForYouGridLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[9998] bg-off-white/95 backdrop-blur-sm overflow-y-auto">
      <div className="mx-auto w-full max-w-[2000px] px-2 py-6 sm:py-8 md:py-10">
        <BusinessGridSkeleton />
      </div>
    </div>
  );
}

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
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const previousPageRef = useRef(currentPage);
  const hasClientLoadingCycleRef = useRef(false);
  const [hasClientFetchSettled, setHasClientFetchSettled] = useState(hasInitialBusinesses);
  const showDebugInfo = process.env.NODE_ENV !== "production";

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

  useEffect(() => {
    if (hasInitialBusinesses) {
      if (!hasClientFetchSettled) {
        setHasClientFetchSettled(true);
      }
      return;
    }

    if (loading) {
      hasClientLoadingCycleRef.current = true;
      return;
    }

    if (hasClientLoadingCycleRef.current && !loading && !hasClientFetchSettled) {
      setHasClientFetchSettled(true);
    }
  }, [hasClientFetchSettled, hasInitialBusinesses, loading]);

  // Visibility-based refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && refetch) {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  const combinedError = error ?? (hasClientFetchSettled ? null : initialError);
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

  useEffect(() => {
    if (!showDebugInfo) return;
    console.info("[FOR_YOU UI]", {
      items: totalCount,
      loading,
      prefsLoading,
      simpleSearchLoading,
      error: combinedError,
      shouldShowSkeleton,
      canRenderResults,
      canShowError,
      isMapMode,
    });
  }, [
    canRenderResults,
    canShowError,
    combinedError,
    isMapMode,
    loading,
    prefsLoading,
    showDebugInfo,
    shouldShowSkeleton,
    simpleSearchLoading,
    totalCount,
  ]);

  useEffect(() => {
    if (!showDebugInfo) return;
    const el = resultsContainerRef.current;
    if (!el) return;

    const styles = window.getComputedStyle(el);
    console.info("[FOR_YOU UI CONTAINER]", {
      height: Math.round(el.getBoundingClientRect().height),
      overflow: styles.overflow,
      overflowY: styles.overflowY,
      transform: styles.transform,
      opacity: styles.opacity,
      visibility: styles.visibility,
      zIndex: styles.zIndex,
      isPaginationLoading,
    });
  }, [canRenderResults, canShowError, isMapMode, showDebugInfo, shouldShowSkeleton, totalCount, isPaginationLoading]);

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

  // Safety mechanism: Reset pagination loading after timeout to prevent stuck state
  useEffect(() => {
    if (!isPaginationLoading) return;
    
    const timeout = setTimeout(() => {
      if (showDebugInfo) {
        console.warn("[FOR_YOU] Pagination loading stuck, force clearing");
      }
      setIsPaginationLoading(false);
    }, 2000); // Clear after 2 seconds max
    
    return () => clearTimeout(timeout);
  }, [isPaginationLoading, showDebugInfo]);

  return (
    <div className="min-h-dvh bg-off-white relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />


      <main className="relative">
        
        <div className="relative mx-auto w-full max-w-[2000px] px-2">
          {/* Breadcrumb */}
          <nav className="relative z-10 pb-1 foryou-load-item foryou-load-delay-0" aria-label="Breadcrumb">
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
          <div className="relative z-10 mb-6 sm:mb-8 px-4 sm:px-6 text-center pt-4 foryou-load-item foryou-load-delay-1">
            <div className="my-4">
              <h1
                className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.2] tracking-tight text-charcoal mx-auto"
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
                }}>Curated Just For You</span>
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
          <div ref={searchWrapRef} className="relative z-10 py-3 sm:py-4 px-4 foryou-load-item foryou-load-delay-2">
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
          <div className="foryou-load-item foryou-load-delay-3">
            <InlineFilters
              show={isSearchActive && debouncedSearchQuery.trim().length > 0}
              filters={filters}
              onDistanceChange={handleInlineDistanceChange}
              onRatingChange={handleInlineRatingChange}
            />
          </div>

          {/* Active Filter Badges - Show when filters are active */}
          <div className="foryou-load-item foryou-load-delay-4">
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
          </div>

          <div className="py-3 sm:py-4 foryou-load-item foryou-load-delay-5">
            <div ref={resultsContainerRef} className="pt-4 sm:pt-6 md:pt-10">
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
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-card-bg text-white hover:bg-card-bg/90 transition-colors text-body font-semibold"
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

                  {/* Skeleton Overlay for Pagination */}
                  {isPaginationLoading && (
                    <ForYouGridLoadingOverlay />
                  )}

                  {/* List | Map Toggle */}
                  <div className="mb-4 px-2 flex items-center justify-end">
                    <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-full p-1 border border-white/30 shadow-sm">
                      <button
                        onClick={() => {
                          console.log('[ForYou] Switching to List mode');
                          setIsMapMode(false);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          !isMapMode
                            ? 'bg-card-bg text-white shadow-sm'
                            : 'text-charcoal/70 hover:text-charcoal'
                        }`}
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        <List className="w-3.5 h-3.5" />
                        List
                      </button>
                      <button
                        onClick={() => {
                          console.log('[ForYou] Switching to Map mode, businesses:', mapBusinesses.length);
                          setIsMapMode(true);
                        }}
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
                      <m.div
                        key="map-view"
                        initial={isDesktop ? { opacity: 0 } : false}
                        animate={isDesktop ? { opacity: 1 } : {}}
                        exit={isDesktop ? { opacity: 0 } : {}}
                        transition={isDesktop ? { duration: 0.2 } : undefined}
                        className="w-full h-[calc(100vh-300px)] min-h-[500px] rounded-[12px] overflow-hidden border border-white/30 shadow-lg"
                      >
                        <BusinessesMap
                          businesses={mapBusinesses}
                          className="w-full h-full"
                        />
                      </m.div>
                    ) : (
                      isDesktop ? (
                        <m.div
                          variants={containerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true, margin: "-50px" }}
                          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2"
                        >
                          {currentBusinesses.map((business) => (
                            <m.div
                              key={business.id}
                              variants={itemVariants}
                              className="list-none relative overflow-hidden desktop-card-shimmer"
                            >
                              <span aria-hidden className="desktop-shimmer-veil" />
                              <div className="md:hidden w-full">
                                <BusinessCard business={business} compact />
                              </div>
                              <div className="hidden md:block">
                                <BusinessCard business={business} compact />
                              </div>
                            </m.div>
                          ))}
                        </m.div>
                      ) : (
                        <m.div
                          key={currentPage}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: isPaginationLoading ? 0 : 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{
                            duration: 0.25,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2">
                            {currentBusinesses.map((business, index) => (
                              <m.div
                                key={business.id}
                                className="list-none"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  type: "spring",
                                  damping: 30,
                                  stiffness: 300,
                                  delay: index * 0.03,
                                }}
                              >
                                <div className="md:hidden w-full">
                                  <BusinessCard business={business} compact />
                                </div>
                                <div className="hidden md:block">
                                  <BusinessCard business={business} compact />
                                </div>
                              </m.div>
                            ))}
                          </div>
                        </m.div>
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

      <style jsx>{`
        .foryou-load-item {
          opacity: 0;
          transform: translate3d(0, 12px, 0);
          filter: blur(2px);
          animation: forYouSectionLoadIn 560ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity, filter;
        }
        .foryou-load-delay-0 { animation-delay: 40ms; }
        .foryou-load-delay-1 { animation-delay: 90ms; }
        .foryou-load-delay-2 { animation-delay: 140ms; }
        .foryou-load-delay-3 { animation-delay: 180ms; }
        .foryou-load-delay-4 { animation-delay: 220ms; }
        .foryou-load-delay-5 { animation-delay: 260ms; }
        @keyframes forYouSectionLoadIn {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .foryou-load-item {
            opacity: 1;
            transform: none;
            filter: none;
            animation: none;
          }
        }
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

      <Footer />
    </div>
  );
}

