// ================================
// File: src/app/Home.tsx
// Description: Home page with smooth search transitions
// ================================

"use client";

import { memo, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import { ChevronUp } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { FilterState } from "../components/FilterModal/FilterModal";
import BusinessRow from "../components/BusinessRow/BusinessRow";
import BusinessRowSkeleton from "../components/BusinessRow/BusinessRowSkeleton";
import FeaturedBusinessesSkeleton from "../components/CommunityHighlights/FeaturedBusinessesSkeleton";
import CommunityHighlightsSkeleton from "../components/CommunityHighlights/CommunityHighlightsSkeleton";
import { useBusinesses, useForYouBusinesses, useTrendingBusinesses } from "../hooks/useBusinesses";
import { useFeaturedBusinesses } from "../hooks/useFeaturedBusinesses";
import { useRoutePrefetch } from "../hooks/useRoutePrefetch";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useAuth } from "../contexts/AuthContext";
import SearchResultsPanel from "../components/SearchResultsPanel/SearchResultsPanel";
import type { Event } from "../lib/types/Event";

// Dynamically import HeroCarousel - it's heavy with images and animations
const HeroCarousel = nextDynamic(
  () => import("../components/Hero/HeroCarousel"),
  {
    loading: () => (
      <div className="h-[calc(100dvh-var(--header-height)-0.5rem)] sm:h-[90dvh] md:h-[80dvh] bg-gradient-to-b from-charcoal/5 to-transparent animate-pulse" />
    ),
  }
);
import { useLiveSearch } from "../hooks/useLiveSearch";

// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

// Removed any animation / scroll-reveal classes and imports.

const EventsSpecials = nextDynamic(
  () => import("../components/EventsSpecials/EventsSpecials"),
  {
    loading: () => <div className="h-96 bg-off-white/50" />,
  }
);

const CommunityHighlights = nextDynamic(
  () => import("../components/CommunityHighlights/CommunityHighlights"),
  {
    loading: () => <FeaturedBusinessesSkeleton count={4} />,
  }
);

const Footer = nextDynamic(() => import("../components/Footer/Footer"), {
  loading: () => <div className="h-64 bg-charcoal" />,
});

const MemoizedBusinessRow = memo(BusinessRow);

function isIOSBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = (navigator as any).platform || '';
  const maxTouchPoints = (navigator as any).maxTouchPoints || 0;
  const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(ua) || isIPadOS;
}

// Match the badge page (`/badges`) scroll-reveal animation exactly.
const homeCardRevealVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const homeCardRevealViewport = { once: true, margin: "-50px" as const };


export default function HomeClient() {
  const [eventsAndSpecials, setEventsAndSpecials] = useState<Event[]>([]);
  const [eventsAndSpecialsLoading, setEventsAndSpecialsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setEventsAndSpecialsLoading(true);
        const url = new URL("/api/events-and-specials", window.location.origin);
        url.searchParams.set("limit", "24");

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const items = Array.isArray(data?.items) ? (data.items as Event[]) : [];

        if (!cancelled) {
          setEventsAndSpecials(items);
        }
      } catch (err) {
        console.warn("[Home] Failed to fetch events-and-specials:", err);
        if (!cancelled) {
          setEventsAndSpecials([]);
        }
      } finally {
        if (!cancelled) {
          setEventsAndSpecialsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  usePredefinedPageTitle('home');
  useScrollReveal({ threshold: 0.12, rootMargin: "0px 0px -120px 0px", once: true });
  const isIOS = useMemo(() => isIOSBrowser(), []);
  const [heroReady, setHeroReady] = useState(false);

  const searchParams = useSearchParams();
  const searchQueryParam = searchParams.get('search') || "";
  const { user } = useAuth();

  const {
    query: liveQuery,
    setQuery,
    loading: liveLoading,
    results: liveResults,
    error: liveError,
    filters: liveFilters,
    setDistanceKm,
    setMinRating,
    resetFilters,
  } = useLiveSearch({
    initialQuery: searchQueryParam,
    debounceMs: 250, // Fast live search
  });

  // Sync URL param with live search
  useEffect(() => {
    if (searchQueryParam !== liveQuery) {
      setQuery(searchQueryParam);
    }
  }, [searchQueryParam, liveQuery, setQuery]);

  // Scroll to top button state (mobile only)
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);
  // ✅ ACTIVE FILTERS: User-initiated, ephemeral UI state (starts empty)
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  // ✅ Track if filters were user-initiated (prevents treating preferences as filters)
  const [hasUserInitiatedFilters, setHasUserInitiatedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ minRating: null, distance: null });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  // ✅ USER PREFERENCES: From onboarding, persistent, used for personalization
  const { interests, subcategories, dealbreakers, loading: prefsLoading } = useUserPreferences();
  const preferences = useMemo(
    () => ({ interests, subcategories, dealbreakers }),
    [interests, subcategories, dealbreakers]
  );
  const { isLoading: authLoading } = useAuth(); // Get auth loading state

  // Destructure and alias refetch functions from business hooks
  const {
    businesses: allBusinesses,
    loading: allBusinessesLoading,
    error: allBusinessesError,
    refetch: refetchAllBusinesses,
  } = useBusinesses({
    // Add any required options here, e.g., filters, location, etc.
  });

  const {
    businesses: forYouBusinesses,
    loading: forYouLoading,
    error: forYouError,
    refetch: refetchForYou,
  } = useForYouBusinesses(20, undefined, {
    preferences,
    preferencesLoading: prefsLoading,
    skip: !user, // Don't fetch For You when not signed in; section shows teaser only
  });

  const {
    businesses: trendingBusinesses,
    loading: trendingLoading,
    error: trendingError,
    statusCode: trendingStatus,
    refetch: refetchTrending,
  } = useTrendingBusinesses();

  // Debug logging for user preferences
  useEffect(() => {
    console.log("[Home] user prefs:", {
      interestsLen: interests.length,
      interests,
      subcategoriesLen: subcategories.length,
      dealbreakersLen: dealbreakers.length,
    });
  }, [interests, subcategories, dealbreakers]);

  // ✅ Determine if we're in "filtered mode" (user explicitly applied filters)
  // CRITICAL: Only true when user has EXPLICITLY initiated filtering
  // This is the single source of truth for whether we're in filtered mode
  const isFiltered = useMemo(() => {
    // MUST have user-initiated flag AND at least one filter active
    return hasUserInitiatedFilters && (selectedInterestIds.length > 0 || filters.minRating !== null || filters.distance !== null);
  }, [hasUserInitiatedFilters, selectedInterestIds, filters]);

  // Fetch featured businesses from API
  const { featuredBusinesses, loading: featuredLoading, error: featuredError, statusCode: featuredStatus } = useFeaturedBusinesses({
    limit: 12,
    region: userLocation ? 'Cape Town' : null, // TODO: Get actual region from user location
    skip: authLoading,
  });

  // Search is active when there's a query in the URL or live query
  const isSearchActive = searchQueryParam.trim().length > 0 || liveQuery.trim().length > 0;
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll to top when entering search mode
  useEffect(() => {
    if (isSearchActive && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isSearchActive]);

  // Note: Prioritization of recently reviewed businesses is now handled on the backend
  // The API automatically prioritizes businesses the user has reviewed within the last 24 hours

  // Set mounted state on client side
  useEffect(() => {
    setMounted(true);
    // Check initial scroll position
    if (typeof window !== 'undefined') {
      setShowScrollTop(window.scrollY > 100);
    }
  }, []);

  // ✅ Guard: Debug logging to track filter state changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Home] Filter state changed:', {
        hasUserInitiatedFilters,
        selectedInterestIdsLength: selectedInterestIds.length,
        selectedInterestIds,
        filters,
        isFiltered,
      });
    }
  }, [hasUserInitiatedFilters, selectedInterestIds, filters, isFiltered]);

  // Handle scroll to top button visibility
  useEffect(() => {
    if (!mounted) return;

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };

    // Check initial position
    handleScroll();

    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener('scroll', handleScroll, options);
    return () => window.removeEventListener('scroll', handleScroll, options);
  }, [mounted]);

  // Scroll to top function
  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleInlineDistanceChange = (distance: string) => {
    const newFilters = { ...filters, distance };
    setFilters(newFilters);
    setHasUserInitiatedFilters(true);

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
    refetchAllBusinesses();
  };

  const handleInlineRatingChange = (rating: number) => {
    const newFilters = { ...filters, minRating: rating };
    setFilters(newFilters);
    setHasUserInitiatedFilters(true);
    refetchAllBusinesses();
  };

  const handleFiltersChange = (f: FilterState) => {
    // ✅ Mark that user has explicitly initiated filtering
    setHasUserInitiatedFilters(true);
    setFilters(f);

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
    refetchAllBusinesses();
    // Note: For You doesn't refetch here because it uses preferences, not filters
  };

  const handleClearFilters = () => {
    // ✅ Reset filter state - return to default mode
    setHasUserInitiatedFilters(false);
    setSelectedInterestIds([]);
    setFilters({ minRating: null, distance: null });
    setUserLocation(null);
    // Trigger refetch to clear filters immediately
    refetchAllBusinesses();
    // Note: For You will automatically show again when not filtered
  };

  const handleUpdateFilter = (filterType: 'minRating' | 'distance', value: number | string | null) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    setHasUserInitiatedFilters(true);

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
    refetchAllBusinesses();
  };

  const handleToggleInterest = (interestId: string) => {
    // ✅ Mark that user has explicitly initiated filtering
    // This is the ONLY way hasUserInitiatedFilters should become true
    console.log('[Home] User toggled interest filter:', interestId);
    setHasUserInitiatedFilters(true);

    setSelectedInterestIds(prev => {
      const newIds = prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId];

      console.log('[Home] Updated selectedInterestIds:', newIds);

      // Immediately trigger refetch when category changes
      setTimeout(() => {
        refetchAllBusinesses();
        // Note: For You doesn't refetch here because it uses preferences, not filters
      }, 0);

      return newIds;
    });
  };

  // Use featured businesses from API instead of client-side computation
  const featuredByCategory = featuredBusinesses;

  // Debug logging for business counts (placed after featuredByCategory is defined)
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 [Home Page] Business Counts Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Home Page] For You:', {
      count: forYouBusinesses.length,
      loading: forYouLoading,
      error: forYouError,
    });
    console.log('[Home Page] Trending:', {
      count: trendingBusinesses.length,
      loading: trendingLoading,
      error: trendingError,
    });
    console.log('[Home Page] All Businesses:', {
      count: allBusinesses.length,
      loading: allBusinessesLoading,
      firstBusiness: allBusinesses[0] ? {
        id: allBusinesses[0].id,
        name: allBusinesses[0].name,
        hasImage: !!(allBusinesses[0].image || allBusinesses[0].image_url || allBusinesses[0].uploaded_images),
      } : null,
    });
    const safeFeatured = Array.isArray(featuredByCategory) ? featuredByCategory : [];
    console.log('[Home Page] Featured by Category:', {
      count: safeFeatured.length,
      loading: featuredLoading,
      categories: safeFeatured.map(f => f.category),
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }, [forYouBusinesses, trendingBusinesses, allBusinesses, forYouLoading, trendingLoading, allBusinessesLoading, featuredByCategory, featuredLoading]);

  useRoutePrefetch([
    "/for-you",
    "/trending",
    "/discover/reviews",
    "/events-specials",
    "/write-review",
    "/saved",
  ]);
  const hasForYouBusinesses = forYouBusinesses.length > 0;
  const hasTrendingBusinesses = trendingBusinesses.length > 0;

  // iOS WebKit tends to be more sensitive to large above-the-fold image/animation work.
  // Defer mounting HeroCarousel until idle or first interaction to avoid "Can't open this page" crashes.
  useEffect(() => {
    if (!isIOS) {
      setHeroReady(true);
      return;
    }
    if (heroReady) return;

    let didSet = false;
    let idleId: number | null = null;
    let delayId: number | null = null;
    const cleanupFns: Array<() => void> = [];

    const markReady = () => {
      if (didSet) return;
      didSet = true;
      setHeroReady(true);
      cleanupFns.forEach((fn) => fn());
      cleanupFns.length = 0;
    };

    const onInteract = () => markReady();

    // Interaction signals: scroll/tap/click.
    window.addEventListener('touchstart', onInteract, { passive: true, once: true });
    window.addEventListener('pointerdown', onInteract, { passive: true, once: true });
    window.addEventListener('scroll', onInteract, { passive: true, once: true });
    cleanupFns.push(() => window.removeEventListener('touchstart', onInteract));
    cleanupFns.push(() => window.removeEventListener('pointerdown', onInteract));
    cleanupFns.push(() => window.removeEventListener('scroll', onInteract));

    const scheduleIdle = () => {
      const anyWindow = window as any;
      if (typeof anyWindow.requestIdleCallback === 'function') {
        idleId = anyWindow.requestIdleCallback(() => markReady(), { timeout: 2500 });
        cleanupFns.push(() => anyWindow.cancelIdleCallback?.(idleId));
      } else {
        delayId = window.setTimeout(() => markReady(), 2500);
        cleanupFns.push(() => delayId != null && clearTimeout(delayId));
      }
    };

    // Small delay so the first paint happens before we schedule heavier work.
    delayId = window.setTimeout(() => scheduleIdle(), 300);
    cleanupFns.push(() => delayId != null && clearTimeout(delayId));

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [isIOS, heroReady]);

  return (
    <>
      <div className="min-h-dvh flex flex-col">
        {/* Hero Carousel - Hidden smoothly when search is active */}
        <AnimatePresence mode="wait">
          {!isSearchActive && (
            <motion.div
              key="hero-carousel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto", transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
              className="overflow-hidden"
            >
              {heroReady ? (
                <HeroCarousel />
              ) : (
                <div className="h-[calc(100dvh-var(--header-height)-0.5rem)] sm:h-[90dvh] md:h-[80dvh] bg-gradient-to-b from-charcoal/5 to-transparent" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <main 
          className={`bg-off-white relative pb-10 min-h-dvh transition-[padding] duration-300 ease-out ${isSearchActive ? 'pt-4' : 'pt-[var(--header-height)]'}`} 
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          <div ref={contentRef} className="mx-auto w-full max-w-[2000px]">
            <AnimatePresence mode="wait">
              {isSearchActive ? (
                /* Search Results Mode */
                <motion.div
                  key="search-results"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="px-4 sm:px-6 lg:px-8"
                >
                  <SearchResultsPanel
                    query={liveQuery.trim() || searchQueryParam.trim()}
                    loading={liveLoading}
                    error={liveError}
                    results={liveResults}
                    filters={liveFilters}
                    onDistanceChange={(value) => setDistanceKm(value)}
                    onRatingChange={(value) => setMinRating(value)}
                    onResetFilters={resetFilters}
                  />
                </motion.div>
              ) : (
                /* Discovery Mode - Default Home Page Content */
                <motion.div
                  key="curated-feed"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.1 } }}
                  exit={{ opacity: 0, y: -20, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
                  className="flex flex-col gap-8 sm:gap-10 md:gap-12 pt-8"
                >
                  {/* For You Section - Only show when NOT filtered */}
                  {!isFiltered && (
                    <motion.div
                      className="relative z-10 snap-start"
                      variants={homeCardRevealVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={homeCardRevealViewport}
                    >
                      {!user ? (
                        /* Not signed in: Show Locked For You Section (teaser only) */
                        <div className="mx-auto w-full max-w-[2000px] px-2">
                          <div className="relative border border-charcoal/10 bg-off-white rounded-[14px] p-6 sm:p-8 md:p-10 text-center space-y-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
                            <h3 className="text-lg sm:text-xl font-bold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                              For You
                            </h3>
                            <p
                              className="text-body sm:text-base text-charcoal/60 max-w-[60ch] mx-auto"
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                              Create an account to unlock personalised recommendations.
                            </p>

                            <div className="pt-2 w-full flex flex-col sm:flex-row items-stretch justify-center gap-3">
                              <Link
                                href="/register"
                                className="mi-tap inline-flex items-center justify-center rounded-full min-h-[48px] px-6 py-3 text-body font-semibold text-white bg-gradient-to-r from-coral to-coral/85 hover:opacity-95 transition-all duration-200 shadow-md w-full sm:w-auto sm:min-w-[180px]"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                              >
                                Create Account
                              </Link>
                              <Link
                                href="/login"
                                className="mi-tap inline-flex items-center justify-center rounded-full min-h-[48px] px-6 py-3 text-body font-semibold text-charcoal border border-charcoal/15 bg-white hover:bg-off-white transition-all duration-200 shadow-sm w-full sm:w-auto sm:min-w-[180px]"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                              >
                                Sign In
                              </Link>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Regular For You Section (Authenticated Users) */
                        <>
                          {forYouLoading ? (
                            <BusinessRowSkeleton title="For You Now" />
                          ) : forYouError ? (
                            <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-coral">
                              Couldn't load personalised picks right now. We'll retry in the background.
                            </div>
                          ) : forYouBusinesses.length > 0 ? (
                            <MemoizedBusinessRow
                              title="For You"
                              businesses={forYouBusinesses}
                              cta="See More"
                              href="/for-you"
                            />
                          ) : (
                            <div className="mx-auto w-full max-w-[2000px] px-2 py-4">
                              <div className="bg-sage/10 border border-sage/30 rounded-lg p-6 text-center">
                                <p className="text-body text-charcoal/70 mb-2">
                                  Curated from your interests
                                </p>
                                <p className="text-body-sm text-charcoal/70">
                                  Based on what you selected — no matches in this section yet. See more on For You or explore Trending.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Filtered Results Section - Show when filters are active */}
                  {isFiltered && (
                    <motion.div
                      className="relative z-10 snap-start"
                      variants={homeCardRevealVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={homeCardRevealViewport}
                    >
                      {allBusinessesLoading ? (
                        <BusinessRowSkeleton title="Filtered Results" />
                      ) : allBusinesses.length > 0 ? (
                        <MemoizedBusinessRow
                          title="Filtered Results"
                          businesses={allBusinesses.slice(0, 10)}
                          cta="See All"
                          href="/for-you"
                        />
                      ) : (
                        <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-charcoal/70">
                          No businesses match your filters. Try adjusting your selections.
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Trending Section - Only show when not filtered */}
                  {!isFiltered && (
                    <motion.div
                      className="relative z-10 snap-start"
                      variants={homeCardRevealVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={homeCardRevealViewport}
                    >
                      {trendingLoading && <BusinessRowSkeleton title="Trending Now" />}
                      {!trendingLoading && hasTrendingBusinesses && (
                        <MemoizedBusinessRow title="Trending Now" businesses={trendingBusinesses} cta="See More" href="/trending" />
                      )}
                      {!trendingLoading && !hasTrendingBusinesses && !trendingError && (
                        <MemoizedBusinessRow title="Trending Now" businesses={[]} cta="See More" href="/trending" />
                      )}
                      {trendingError && !trendingLoading && (
                        <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-coral space-y-1">
                          <p className="font-medium">Trending</p>
                          <p>{trendingError}</p>
                          {trendingStatus != null && (
                            <p className="text-charcoal/70">Status: {trendingStatus}</p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Events & Specials */}
                  <motion.div
                    className="relative z-10 snap-start"
                    variants={homeCardRevealVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={homeCardRevealViewport}
                  >
                    <EventsSpecials
                      events={eventsAndSpecials}
                      loading={eventsAndSpecialsLoading}
                    />
                  </motion.div>

                  {/* Community Highlights (Featured by Category) */}
                  <motion.div
                    className="relative z-10 snap-start"
                    variants={homeCardRevealVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={homeCardRevealViewport}
                  >
                    {featuredError && !featuredLoading ? (
                      <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-coral space-y-1">
                        <p className="font-medium">Featured</p>
                        <p>{featuredError}</p>
                        {featuredStatus != null && (
                          <p className="text-charcoal/70">Status: {featuredStatus}</p>
                        )}
                      </div>
                    ) : allBusinessesLoading ? (
                      <CommunityHighlightsSkeleton reviewerCount={4} businessCount={4} />
                    ) : (
                      <CommunityHighlights
                        businessesOfTheMonth={Array.isArray(featuredByCategory) ? featuredByCategory : []}
                        variant="reviews"
                      />
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
        <Footer />
      </div>

      {/* Scroll to Top Button - Mobile Only */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="md:hidden fixed bottom-6 right-6 z-[100] w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-sage to-sage/90 hover:from-sage/90 hover:to-sage/80 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-sage/30 hover:scale-110"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}
    </>
  );
}
