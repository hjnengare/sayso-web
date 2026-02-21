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
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { useIsDesktop } from "../hooks/useIsDesktop";
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
import type { Event } from "../lib/types/Event";

// Dynamically import HeroCarousel - it's heavy with images and animations
import HeroSkeleton from "../components/Hero/HeroSkeleton";
import MobileHeroSkeleton from "../components/Hero/MobileHeroSkeleton";

const HeroCarousel = nextDynamic(
  () => import("../components/Hero/HeroCarousel"),
  {
    loading: () => <HeroSkeleton />,
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

const SearchResultsPanel = nextDynamic(
  () => import("../components/SearchResultsPanel/SearchResultsPanel"),
  {
    loading: () => <div className="min-h-[40vh] w-full" />,
  }
);

const MemoizedBusinessRow = memo(BusinessRow);

function isIOSBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = (navigator as any).platform || '';
  const maxTouchPoints = (navigator as any).maxTouchPoints || 0;
  const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(ua) || isIPadOS;
}


export default function HomeClient() {
  const isDesktop = useIsDesktop();
  const isDev = process.env.NODE_ENV === "development";
  const [eventsAndSpecials, setEventsAndSpecials] = useState<Event[]>([]);
  const [eventsAndSpecialsLoading, setEventsAndSpecialsLoading] = useState(true);

  // Defer below-fold Events fetch to prioritize above-fold content (For You, Trending)
  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        setEventsAndSpecialsLoading(true);
        const url = new URL("/api/events-and-specials", window.location.origin);
        url.searchParams.set("limit", "12");

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
        if (process.env.NODE_ENV === "development") {
          console.warn("[Home] Failed to fetch events-and-specials:", err);
        }
        if (!cancelled) {
          setEventsAndSpecials([]);
        }
      } finally {
        if (!cancelled) {
          setEventsAndSpecialsLoading(false);
        }
      }
    };

    const scheduleFetch = () => {
      const w = typeof window !== "undefined" ? (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }) : null;
      if (w?.requestIdleCallback) {
        const id = w.requestIdleCallback(() => {
          if (!cancelled) void fetchEvents();
        }, { timeout: 200 });
        return () => w.cancelIdleCallback?.(id);
      }
      const id = setTimeout(() => {
        if (!cancelled) void fetchEvents();
      }, 150);
      return () => clearTimeout(id);
    };

    const cleanup = scheduleFetch();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  usePredefinedPageTitle('home');
  const isIOS = useMemo(() => isIOSBrowser(), []);
  // Start false so server and client render the same markup; enable after mount.
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
  const hasActiveFilters = selectedInterestIds.length > 0 || filters.minRating !== null || filters.distance !== null;
  const isFiltered = hasUserInitiatedFilters && hasActiveFilters;
  // ✅ USER PREFERENCES: From onboarding, persistent, used for personalization
  const { interests, subcategories, dealbreakers, loading: prefsLoading } = useUserPreferences();
  const preferences = useMemo(
    () => ({ interests, subcategories, dealbreakers }),
    [interests, subcategories, dealbreakers]
  );
  // Destructure and alias refetch functions from business hooks
  const {
    businesses: allBusinesses,
    loading: allBusinessesLoading,
    refetch: refetchAllBusinesses,
  } = useBusinesses({
    // Filtered results section is hidden by default; avoid fetching it on first paint.
    skip: !isFiltered,
  });

  const {
    businesses: forYouBusinesses,
    loading: forYouLoading,
    error: forYouError,
  } = useForYouBusinesses(20, undefined, {
    preferences,
    preferencesLoading: false, // Fire immediately with available prefs; re-fetches when prefs load
    skip: !user, // Don't fetch For You when not signed in; section shows teaser only
  });

  const {
    businesses: trendingBusinesses,
    loading: trendingLoading,
    error: trendingError,
    statusCode: trendingStatus,
  } = useTrendingBusinesses();

  // Debug logging for user preferences
  useEffect(() => {
    if (!isDev) return;
    console.log("[Home] user prefs:", {
      interestsLen: interests.length,
      interests,
      subcategoriesLen: subcategories.length,
      dealbreakersLen: dealbreakers.length,
    });
  }, [interests, subcategories, dealbreakers, isDev]);

  // Fetch featured businesses from API
  const { featuredBusinesses, loading: featuredLoading, error: featuredError, statusCode: featuredStatus } = useFeaturedBusinesses({
    limit: 12,
    region: userLocation ? 'Cape Town' : null, // TODO: Get actual region from user location
    skip: false,
    deferMs: 150, // Defer below-fold Community Highlights to prioritize For You / Trending
  });

  // Note: Visibility-based refetch is handled by each hook (useBusinesses, useForYouBusinesses,
  // useTrendingBusinesses, useFeaturedBusinesses) to avoid duplicate listeners and requests.

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
            if (isDev) console.warn('Error getting user location:', error);
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
            if (isDev) console.warn('Error getting user location:', error);
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
    refetchAllBusinesses();
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
            if (isDev) console.warn('Error getting user location:', error);
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
    if (isDev) {
      console.log('[Home] User toggled interest filter:', interestId);
    }
    setHasUserInitiatedFilters(true);

    setSelectedInterestIds(prev => {
      const newIds = prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId];

      if (isDev) {
        console.log('[Home] Updated selectedInterestIds:', newIds);
      }

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
    if (!isDev) return;
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
  }, [forYouBusinesses, trendingBusinesses, allBusinesses, forYouLoading, trendingLoading, allBusinessesLoading, featuredByCategory, featuredLoading, isDev]);

  useRoutePrefetch(
    [
      "/for-you",
      "/trending",
      "/discover/reviews",
      "/events-specials",
      "/write-review",
      "/saved",
    ],
    { delay: 1500 }
  );
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
        // Reduced timeout from 1200ms to 300ms for faster perceived load
        idleId = anyWindow.requestIdleCallback(() => markReady(), { timeout: 300 });
        cleanupFns.push(() => anyWindow.cancelIdleCallback?.(idleId));
      } else {
        // Reduced delay from 1200ms to 300ms
        delayId = window.setTimeout(() => markReady(), 300);
        cleanupFns.push(() => delayId != null && clearTimeout(delayId));
      }
    };

    // Start immediately instead of waiting 100ms
    scheduleIdle();

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [isIOS, heroReady]);

  return (
    <>
      <div suppressHydrationWarning className="min-h-dvh flex flex-col bg-off-white">
        {/* Hero Carousel - Hidden when search is active */}
        {!isSearchActive && (
          <div className="overflow-hidden">
            {heroReady ? (
              <HeroCarousel />
            ) : isDesktop ? (
              <HeroSkeleton />
            ) : (
              <MobileHeroSkeleton />
            )}
          </div>
        )}

        <main 
          suppressHydrationWarning
          className={`relative min-h-dvh ${isSearchActive ? 'pt-2' : 'pt-8 sm:pt-10 md:pt-12'}`} 
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {/* Background Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
          <div suppressHydrationWarning ref={contentRef} className="relative mx-auto w-full max-w-[2000px]">
            {isSearchActive ? (
              /* Search Results Mode */
              <div className="px-4 sm:px-6 lg:px-8">
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
              </div>
            ) : (
              /* Discovery Mode - Default Home Page Content */
              <div className="flex flex-col gap-8 sm:gap-10 md:gap-12 pt-0">
                  {/* For You Section - Only show when NOT filtered */}
                  {!isFiltered && (
                    (() => {
                      const className = "relative z-10 snap-start";
                      const children = (
                        <>
                      {!user ? (
                        /* Not signed in: Show Locked For You Section (teaser only) */
                        <div className="mx-auto w-full max-w-[2000px] px-2 pt-4 sm:pt-8 md:pt-10">
                          <div className="relative border border-charcoal/10 bg-off-white rounded-[14px] p-6 sm:p-8 md:p-10 text-center space-y-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
                            <h3
                              className="text-lg sm:text-xl font-extrabold text-charcoal"
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
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
                                className="mi-tap inline-flex items-center justify-center rounded-full min-h-[48px] px-6 py-3 text-body font-semibold text-white bg-gradient-to-r from-coral to-coral/85 hover:opacity-95 shadow-md w-full sm:w-auto sm:min-w-[180px]"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                              >
                                Create Account
                              </Link>
                              <Link
                                href="/onboarding"
                                className="mi-tap inline-flex items-center justify-center rounded-full min-h-[48px] px-6 py-3 text-body font-semibold text-charcoal border border-charcoal/15 bg-white hover:bg-off-white shadow-sm w-full sm:w-auto sm:min-w-[180px]"
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
                              disableAnimations
                            />
                          ) : (
                            <div className="mx-auto w-full max-w-[2000px] px-2 py-4">
                              <div className="bg-card-bg/10 border border-sage/30 rounded-lg p-6 text-center">
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
                        </>
                      );
                      return (
                        <div className={className}>{children}</div>
                      );
                    })()
                  )}

                  {/* Filtered Results Section - Show when filters are active */}
                  {isFiltered && (
                    <div className="relative z-10 snap-start">
                      {allBusinessesLoading ? (
                        <BusinessRowSkeleton title="Filtered Results" />
                      ) : allBusinesses.length > 0 ? (
                        <MemoizedBusinessRow
                          title="Filtered Results"
                          businesses={allBusinesses.slice(0, 10)}
                          cta="See All"
                          href="/for-you"
                          disableAnimations
                        />
                      ) : (
                        <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-charcoal/70">
                          No businesses match your filters. Try adjusting your selections.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trending Section - Only show when not filtered */}
                  {!isFiltered && (
                    <div className="relative z-10 snap-start">
                      {trendingLoading && <BusinessRowSkeleton title="Trending Now" />}
                      {!trendingLoading && hasTrendingBusinesses && (
                        <MemoizedBusinessRow title="Trending Now" businesses={trendingBusinesses} cta="See More" href="/trending" disableAnimations />
                      )}
                      {!trendingLoading && !hasTrendingBusinesses && !trendingError && (
                        <MemoizedBusinessRow title="Trending Now" businesses={[]} cta="See More" href="/trending" disableAnimations />
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
                    </div>
                  )}

                  {/* Events & Specials */}
                  <div className="relative z-10 snap-start">
                    <EventsSpecials
                      events={eventsAndSpecials}
                      loading={eventsAndSpecialsLoading}
                      titleFontWeight={800}
                      ctaFontWeight={400}
                      premiumCtaHover
                      disableAnimations
                    />
                  </div>

                  {/* Community Highlights (Featured by Category) */}
                  <div className="relative z-10 snap-start">
                    {featuredError && !featuredLoading ? (
                      <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-coral space-y-1">
                        <p className="font-medium">Featured</p>
                        <p>{featuredError}</p>
                        {featuredStatus != null && (
                          <p className="text-charcoal/70">Status: {featuredStatus}</p>
                        )}
                      </div>
                    ) : featuredLoading ? (
                      <CommunityHighlightsSkeleton reviewerCount={12} businessCount={4} />
                    ) : (
                      <CommunityHighlights
                        businessesOfTheMonth={Array.isArray(featuredByCategory) ? featuredByCategory : []}
                        variant="reviews"
                        disableAnimations
                      />
                    )}
                  </div>
                </div>
              )}
          </div>
        </main>
        <Footer />
      </div>

      {/* Scroll to Top Button - Mobile Only */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="md:hidden fixed bottom-6 right-6 z-[100] w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-sage to-sage/90 hover:from-sage/90 hover:to-sage/80 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center border border-sage/30"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}
    </>
  );
}
