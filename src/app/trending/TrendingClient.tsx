"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { getChoreoItemMotion } from "../lib/motion/choreography";
import {
  getMobileSafeContainerMotion,
  getMobileSafeItemMotion,
} from "../lib/motion/mobileMotionPolicy";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import Footer from "../components/Footer/Footer";
import { ChevronRight } from "lucide-react";
import Pagination from "../components/EventsPage/Pagination";
import { useBusinesses } from "../hooks/useBusinesses";
import { useTrendingBusinesses } from "../hooks/useTrendingBusinesses";
import { useDebounce } from "../hooks/useDebounce";
import { FilterState } from "../components/FilterModal/FilterModal";
import BusinessesMap, { BusinessMapItem } from "../components/maps/BusinessesMap";
import { Loader } from "../components/Loader/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { useScrollReveal } from "../hooks/useScrollReveal";
import BusinessGridSkeleton from "../components/Explore/BusinessGridSkeleton";
import { useIsDesktop } from "../hooks/useIsDesktop";
import ListMapToggle from "./ListMapToggle";
import SearchFilterBar from "./SearchFilterBar";
import type { Business } from "../components/BusinessCard/BusinessCard";
// Trending = cold-start API (/api/trending): metadata-only score, diversity-first selection, deterministic rotation.

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

// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

const ITEMS_PER_PAGE = 12;

interface TrendingClientProps {
  fallbackData?: Business[];
}

export default function TrendingClient({ fallbackData }: TrendingClientProps = {}) {
  usePredefinedPageTitle('trending');
  useScrollReveal({ threshold: 0.12, rootMargin: "0px 0px -120px 0px", once: true });
  const isDesktopViewport = useIsDesktop();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const desktopChoreoEnabled = !prefersReducedMotion && isDesktopViewport;
  const mobileMotionEnabled = !prefersReducedMotion && !isDesktopViewport;
  const [currentPage, setCurrentPage] = useState(1);

  const [isDesktop, setIsDesktop] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({ minRating: null, distance: null });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const previousPageRef = useRef(currentPage);

  // Debounce search query for real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isSearching = debouncedSearchQuery.trim().length > 0;

  // Convert distance string to km number
  const radiusKm = useMemo(() => {
    if (!filters.distance) return null;
    const match = filters.distance.match(/(\d+)\s*km/);
    return match ? parseInt(match[1]) : null;
  }, [filters.distance]);

  // --------------------------------------------------------------------------
  // Two modes: default = cold-start trending API; search = /api/businesses with query/filters.
  // --------------------------------------------------------------------------

  // Default mode: cold-start trending (/api/trending) — diverse, fresh, deterministic rotation
  const {
    businesses: trendingResults,
    loading: trendingLoading,
    error: trendingError,
    refetch: refetchTrending,
  } = useTrendingBusinesses({
    limit: 50,
    skip: isSearching,
    fallbackData,
  });

  // Alias for non-search (trending API returns same shape as Business card)
  const defaultResults = trendingResults;
  const defaultLoading = trendingLoading;
  const defaultError = trendingError;
  const refetchDefault = refetchTrending;

  // Search mode: same API with search + filters
  const {
    businesses: searchResults,
    loading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useBusinesses({
    limit: 50,
    feedStrategy: "standard",
    searchQuery: isSearching ? debouncedSearchQuery : null,
    sort: "relevance",
    minRating: filters.minRating,
    radiusKm: radiusKm,
    latitude: userLocation?.lat ?? null,
    longitude: userLocation?.lng ?? null,
    skip: !isSearching,
    cache: "no-store",
  });

  const rawBusinesses = isSearching ? searchResults : defaultResults;
  const loading = isSearching ? searchLoading : defaultLoading;
  const error = isSearching ? searchError : defaultError;
  const refetch = isSearching ? refetchSearch : refetchDefault;

  // Visibility-based refresh - refetch when returning to tab
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

  const trendingBusinesses = rawBusinesses;

  const totalPages = useMemo(() => Math.ceil(trendingBusinesses.length / ITEMS_PER_PAGE), [trendingBusinesses.length]);
  const currentBusinesses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return trendingBusinesses.slice(startIndex, endIndex);
  }, [trendingBusinesses, currentPage]);

  // Convert all businesses to map format (filter out null coords)
  // Map shows ALL businesses, not just current page
  const mapBusinesses = useMemo((): BusinessMapItem[] => {
    return trendingBusinesses
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
        category: b.category,
        image_url: b.image_url,
        slug: b.slug,
      }));
  }, [trendingBusinesses]);

  const handleClearFilters = () => {
    setFilters({ minRating: null, distance: null });
    setUserLocation(null);
    setCurrentPage(1);
    refetch();
  };

  const handleInlineDistanceChange = (distance: string) => {
    setFilters(prev => ({ ...prev, distance }));
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

    refetch();
  };

  const handleInlineRatingChange = (rating: number) => {
    setFilters(prev => ({ ...prev, minRating: rating }));
    setCurrentPage(1);
    refetch();
  };

  const handleUpdateFilter = (filterType: 'minRating' | 'distance', value: number | string | null) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
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
  };

  // Detect desktop breakpoint (lg and above)
  useEffect(() => {
    const updateIsDesktop = () => setIsDesktop(typeof window !== "undefined" && window.innerWidth >= 1024);
    updateIsDesktop();
    window.addEventListener("resize", updateIsDesktop);
    return () => window.removeEventListener("resize", updateIsDesktop);
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

  return (
    <div className="min-h-dvh relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />


      <main className="relative">
        
        <div className="relative mx-auto w-full max-w-[2000px] px-2">
          {/* Breadcrumb */}
          <m.nav
            className="relative z-10 pb-1"
            aria-label="Breadcrumb"
            {...getChoreoItemMotion({ order: 0, intent: "inline", enabled: desktopChoreoEnabled })}
          >
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
                  Trending
                </span>
              </li>
            </ol>
          </m.nav>

          {/* Title and Description Block */}
          <m.div
            className="relative z-10 mb-6 sm:mb-8 px-4 sm:px-6 text-center pt-4"
            {...getChoreoItemMotion({ order: 1, intent: "heading", enabled: desktopChoreoEnabled })}
          >
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
                }}>Trending Now</span>
              </h1>
            </div>
            <p className="text-sm sm:text-base text-charcoal/70 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              See what's hot right now! Explore the most popular and highly-rated businesses
              that everyone's talking about in your area.
            </p>
          </m.div>

          <m.div
            {...getChoreoItemMotion({ order: 2, intent: "section", enabled: desktopChoreoEnabled })}
          >
            <SearchFilterBar
              searchWrapRef={searchWrapRef}
              isSearching={isSearching}
              filters={filters}
              onSearch={handleSearchChange}
              onSubmitQuery={handleSubmitQuery}
              onDistanceChange={handleInlineDistanceChange}
              onRatingChange={handleInlineRatingChange}
              onRemoveFilter={(filterType) => {
                const newFilters = { ...filters, [filterType]: null };
                setFilters(newFilters);
                refetch();
              }}
              onUpdateFilter={handleUpdateFilter}
              onClearAll={handleClearFilters}
            />
          </m.div>

          <m.div
            className="py-3 sm:py-4"
            {...getChoreoItemMotion({ order: 3, intent: "section", enabled: desktopChoreoEnabled })}
          >
            <div className="pt-4 sm:pt-6 md:pt-10">
            {/* Show skeleton loader while businesses are loading */}
            {loading && (
              <BusinessGridSkeleton />
            )}
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
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-card-bg text-white hover:bg-card-bg/90 transition-colors text-body font-semibold"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && (
              <>
                {trendingBusinesses.length === 0 ? (
                  isSearching ? (
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
                    /* Default empty state */
                    <div className="bg-white border border-sage/20 rounded-3xl shadow-sm px-6 py-16 text-center space-y-3">
                      <h2 className="text-h2 font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        No trending businesses yet
                      </h2>
                      <p className="text-body-sm text-charcoal/60 max-w-[70ch] mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                        Check back soon for trending businesses in your area.
                      </p>
                    </div>
                  )
                ) : (
                  <>
                    {/* Loading Spinner Overlay for Pagination */}
                    {isPaginationLoading && (
                      <div
                        className={`fixed inset-0 z-[9998] bg-off-white/95 ${
                          isDesktopViewport ? "backdrop-blur-sm" : ""
                        } flex items-center justify-center min-h-[100dvh]`}
                      >
                        <Loader size="lg" variant="wavy" color="sage"  />
                      </div>
                    )}

                    {/* List | Map Toggle */}
                    <ListMapToggle
                      isMapMode={isMapMode}
                      onListMode={() => setIsMapMode(false)}
                      onMapMode={() => setIsMapMode(true)}
                      mapBusinessCount={mapBusinesses.length}
                    />

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
                            {...getMobileSafeContainerMotion(mobileMotionEnabled)}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2">
                              {currentBusinesses.map((business, index) => (
                                <m.div
                                  key={business.id}
                                  className="list-none"
                                  {...getMobileSafeItemMotion(index, mobileMotionEnabled)}
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
          </m.div>
        </div>
      </main>

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

      <Footer />
    </div>
  );
}
