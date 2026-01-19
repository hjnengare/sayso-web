// ================================
// File: src/app/Home.tsx
// Description: Home page with ALL scroll-reveal removed
// ================================

"use client";

import { memo, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import { ChevronUp, Lock } from "lucide-react";
import Link from "next/link";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import Header from "../components/Header/Header";
import SearchInput from "../components/SearchInput/SearchInput";
import { FilterState } from "../components/FilterModal/FilterModal";
import ActiveFilterBadges from "../components/FilterActiveBadges/ActiveFilterBadges";
import InlineFilters from "../components/Home/InlineFilters";
import SearchResultsMap from "../components/BusinessMap/SearchResultsMap";
import { motion, AnimatePresence } from "framer-motion";
import { List, Map as MapIcon } from "lucide-react";
import BusinessRow from "../components/BusinessRow/BusinessRow";
import BusinessRowSkeleton from "../components/BusinessRow/BusinessRowSkeleton";
import FeaturedBusinessesSkeleton from "../components/CommunityHighlights/FeaturedBusinessesSkeleton";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import { Loader } from "../components/Loader/Loader";
import ScrollHint from "../components/ScrollHint/ScrollHint";
import { useBusinesses, useForYouBusinesses, useTrendingBusinesses } from "../hooks/useBusinesses";
import { useSimpleBusinessSearch } from "../hooks/useSimpleBusinessSearch";
import { useEvents } from "../hooks/useEvents";
import { useRoutePrefetch } from "../hooks/useRoutePrefetch";
import { useDebounce } from "../hooks/useDebounce";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useAuth } from "../contexts/AuthContext";

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

export default function Home() {
  usePredefinedPageTitle('home');
  
  const searchParams = useSearchParams();
  const isGuestMode = searchParams.get('guest') === 'true';
  const { user } = useAuth();
  
  // Scroll to top button state (mobile only)
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // ✅ ACTIVE FILTERS: User-initiated, ephemeral UI state (starts empty)
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  // ✅ Track if filters were user-initiated (prevents treating preferences as filters)
  const [hasUserInitiatedFilters, setHasUserInitiatedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ minRating: null, distance: null });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  // ✅ USER PREFERENCES: From onboarding, persistent, used for personalization
  const { interests, subcategories, loading: prefsLoading } = useUserPreferences();
  const { isLoading: authLoading } = useAuth(); // Get auth loading state

  // Debounce search query for real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Debug logging for user preferences
  useEffect(() => {
    console.log("[Home] user prefs:", { interestsLen: interests.length, interests, subcategoriesLen: subcategories.length });
  }, [interests, subcategories]);

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

  // ✅ Determine if we're in "filtered mode" (user explicitly applied filters)
  // CRITICAL: Only true when user has EXPLICITLY initiated filtering
  // This is the single source of truth for whether we're in filtered mode
  const isFiltered = useMemo(() => {
    // MUST have user-initiated flag AND at least one filter active
    const hasActiveFilters = (
      selectedInterestIds.length > 0 ||
      filters.minRating !== null ||
      filters.distance !== null
    );
    
    const result = hasUserInitiatedFilters && hasActiveFilters;
    
    // Debug logging to track state changes
    if (process.env.NODE_ENV === 'development') {
      console.log('[Home] isFiltered check:', {
        hasUserInitiatedFilters,
        selectedInterestIdsLength: selectedInterestIds.length,
        selectedInterestIds,
        minRating: filters.minRating,
        distance: filters.distance,
        hasActiveFilters,
        isFiltered: result,
      });
    }
    
    return result;
  }, [hasUserInitiatedFilters, selectedInterestIds, filters.minRating, filters.distance]);

  // ✅ ACTIVE FILTERS: Only used when user explicitly filters
  const activeInterestIds = useMemo(() => {
    // Only use selectedInterestIds if user has explicitly initiated filtering
    if (hasUserInitiatedFilters && selectedInterestIds.length > 0) {
      return selectedInterestIds;
    }
    // Otherwise, don't filter by interests (show all or use preferences for personalization)
    return undefined;
  }, [hasUserInitiatedFilters, selectedInterestIds]);

  // ✅ PREFERENCES: Used for For You personalization (separate from filters)
  const preferenceInterestIds = useMemo(() => {
    const userInterestIds = interests.map((i) => i.id).concat(
      subcategories.map((s) => s.id)
    );
    return userInterestIds.length > 0 ? userInterestIds : undefined;
  }, [interests, subcategories]);

  // ✅ CRITICAL: Skip fetching until auth is ready
  // This prevents fetching as anon user before session is established
  // ✅ For You uses PREFERENCES, not active filters
  const { businesses: forYouBusinesses, loading: forYouLoading, error: forYouError, refetch: refetchForYou } = useForYouBusinesses(10, preferenceInterestIds, {
    skip: authLoading, // ✅ Wait for auth to be ready
  });
  const { businesses: trendingBusinesses, loading: trendingLoading, error: trendingError } = useTrendingBusinesses(10, { 
    interestIds: activeInterestIds,
    skip: authLoading, // ✅ Wait for auth to be ready
  });
  const { events, loading: eventsLoading } = useEvents({ limit: 5, upcoming: true });
  const { businesses: allBusinesses, loading: allBusinessesLoading, refetch: refetchAllBusinesses } = useBusinesses({ 
    limit: 500, // Increased to ensure we get businesses from more subcategories
    sortBy: "total_rating", 
    sortOrder: "desc", 
    feedStrategy: debouncedSearchQuery.trim().length > 0 ? "standard" : "mixed",
    searchQuery: debouncedSearchQuery.trim().length > 0 ? debouncedSearchQuery : null,
    sort: sortStrategy,
    interestIds: activeInterestIds,
    minRating: filters.minRating,
    radiusKm: radiusKm,
    latitude: userLocation?.lat ?? null,
    longitude: userLocation?.lng ?? null,
    skip: authLoading, // ✅ Wait for auth to be ready
  });

  // Check if search is active (2+ characters)
  const isSearchActive = debouncedSearchQuery.trim().length > 1;

  // Use simple search when query is 2+ characters
  const { results: searchResults, isSearching: simpleSearchLoading } = useSimpleBusinessSearch(
    debouncedSearchQuery,
    300
  );

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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSubmitQuery = (query: string) => {
    setSearchQuery(query);
    setIsMapMode(false); // Reset to list view when new search
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

  const featuredByCategory = (() => {
    if (!allBusinesses || !Array.isArray(allBusinesses) || allBusinesses.length === 0) return [];

    const bySubCategory = new Map<string, any>();

    const getDisplayRating = (b: any) =>
      (typeof b.totalRating === "number" && b.totalRating) ||
      (typeof b.rating === "number" && b.rating) ||
      (typeof b?.stats?.average_rating === "number" && b.stats.average_rating) ||
      0;

    const getReviews = (b: any) =>
      (typeof b.reviews === "number" && b.reviews) ||
      (typeof b.total_reviews === "number" && b.total_reviews) ||
      0;

    const toTitle = (value?: string) =>
      (value || "Business")
        .toString()
        .split(/[-_]/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");

    // Group by subInterestLabel or subInterestId first (more specific), fallback to category
    for (const b of allBusinesses) {
      // Use subInterestLabel or subInterestId for more granular grouping
      const subCat = (b.subInterestLabel || b.subInterestId || b.category || "Business") as string;
      const existing = bySubCategory.get(subCat);
      if (!existing || getDisplayRating(b) > getDisplayRating(existing)) {
        bySubCategory.set(subCat, b);
      }
    }

    const results = Array.from(bySubCategory.entries()).map(([subCat, b], index) => {
      const rating = getDisplayRating(b);
      const reviews = getReviews(b);
      const categoryLabel = toTitle(b.subInterestLabel || b.subInterestId || b.category || subCat);
      return {
        id: b.id,
        name: b.name,
        image: b.image || b.image_url || (b.uploaded_images && b.uploaded_images.length > 0 ? b.uploaded_images[0] : null) || "",
        alt: b.alt || b.name,
        category: b.category || "Business",
        description: b.description || `Featured in ${categoryLabel}`,
        location: b.location || b.address || "Cape Town",
        rating: rating > 0 ? 5 : 0,
        reviewCount: reviews,
        totalRating: rating,
        reviews,
        badge: "featured" as const,
        rank: index + 1,
        href: `/business/${b.slug || b.id}`,
        monthAchievement: `Featured ${categoryLabel}`,
        verified: Boolean(b.verified),
      };
    });

    results.sort((a, b) => b.totalRating - a.totalRating || b.reviews - a.reviews);
    return results;
  })();

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
    console.log('[Home Page] Featured by Category:', {
      count: featuredByCategory.length,
      categories: featuredByCategory.map(f => f.category),
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }, [forYouBusinesses, trendingBusinesses, allBusinesses, forYouLoading, trendingLoading, allBusinessesLoading, featuredByCategory]);

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

  return (
    <>
      <div className="min-h-dvh bg-off-white relative overflow-hidden" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>

      {/* Global navbar header fixed at top-0 */}
      <Header
        showSearch={true}
        variant="frosty"
        backgroundClassName="bg-navbar-bg"
        searchLayout="floating"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />

      <main className="bg-off-white relative pt-20 sm:pt-24 pb-16 snap-y snap-proximity md:snap-mandatory">
        <div className="mx-auto w-full max-w-[2000px]">
          {/* Search Input at top of home content */}
          <div ref={searchWrapRef} className="py-8 px-4 sm:px-6">
            <SearchInput
              variant="header"
              placeholder="Discover cool local gems..."
              mobilePlaceholder="Search places, coffee, yoga…"
              onSearch={handleSearchChange}
              onSubmitQuery={handleSubmitQuery}
              onMapClick={() => {
                if (isSearchActive) {
                  setIsMapMode(!isMapMode);
                }
              }}
              showMap={isSearchActive}
              isMapMode={isMapMode}
              showFilter={false}
            />
          </div>

          {/* Inline Filters - Only show when user is typing/searching */}
          <InlineFilters
            show={isSearchActive && debouncedSearchQuery.trim().length > 0}
            filters={filters}
            onDistanceChange={handleInlineDistanceChange}
            onRatingChange={handleInlineRatingChange}
          />


          {/* Active Filter Badges */}
          <ActiveFilterBadges
            filters={filters}
            onRemoveFilter={(filterType) => {
              const newFilters = { ...filters, [filterType]: null };
              setFilters(newFilters);
              refetchAllBusinesses();
              refetchForYou();
            }}
            onUpdateFilter={handleUpdateFilter}
            onClearAll={handleClearFilters}
          />

          <AnimatePresence mode="wait">
          {isSearchActive ? (
            /* Search Results View - Styled like Explore page */
            <div
              key="search-results"
              className="py-3 sm:py-4"
            >
              <div className="pt-4 sm:pt-6 md:pt-10">
                {allBusinessesLoading && (
                  <div className="min-h-[60vh] bg-off-white flex items-center justify-center">
                    <Loader size="lg" variant="wavy" color="sage" />
                  </div>
                )}
                {!allBusinessesLoading && searchResults.length === 0 && (
                  <div className="w-full sm:max-w-md lg:max-w-lg xl:max-w-xl sm:mx-auto relative z-10">
                    <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 text-center space-y-4">
                      <h2 className="text-h2 font-semibold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        No results found
                      </h2>
                      <p className="text-body-sm text-white/80 max-w-[70ch] mx-auto leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
                        We couldn't find any businesses matching "{debouncedSearchQuery}". Try adjusting your search or check back soon.
                      </p>
                    </div>
                  </div>
                )}
                {!allBusinessesLoading && searchResults.length > 0 && (
                  <>
                    {/* Show search status and List/Map toggle */}
                    <div className="mb-4 px-2 flex items-center justify-between">
                      <div className="text-sm text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for "{debouncedSearchQuery}"
                      </div>
                      {/* List | Map Toggle */}
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
                    {/* Map View or List View */}
                    {isMapMode ? (
                      <div className="w-full h-[calc(100vh-300px)] min-h-[500px] rounded-[20px] overflow-hidden border border-white/30 shadow-lg">
                        <SearchResultsMap
                          businesses={searchResults as any}
                          userLocation={userLocation}
                          onBusinessClick={(business) => {
                            // Navigate to business page
                            window.location.href = `/business/${business.slug || business.id}`;
                          }}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-3">
                        {searchResults.map((business, index) => (
                          <div key={business.id} className="list-none">
                            <BusinessCard business={business as any} compact inGrid={true} index={index} />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Default Home Page Content */
            <div
              key="curated-feed"
              className="flex flex-col gap-8 sm:gap-10 md:gap-12 pt-8"
            >
              {/* ✅ For You Section - Only show when NOT filtered, NOT searching, AND prefs are ready */}
              {!isFiltered && !isSearchActive && !prefsLoading && (
                <div className="relative z-10 snap-start">
                  {isGuestMode ? (
                    /* Guest Mode: Show Locked For You Section */
                    <div className="mx-auto w-full max-w-[2000px] px-2">
                      <div className="relative border border-charcoal/10 rounded-[20px] p-6 sm:p-8 md:p-10 text-center space-y-3">
                        <h3 className="text-lg sm:text-xl font-bold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                          For You
                        </h3>
                        <p className="text-body sm:text-base text-charcoal/60 max-w-[60ch] mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                          Sign up to unlock personalized recommendations tailored to your interests.
                          <br />
                          <Link
                            href="/register"
                            className="inline-block mt-2 font-semibold text-coral hover:underline"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                          >
                            Create an account
                          </Link>
                          {' '}or{' '}
                          <Link
                            href="/login"
                            className="inline-block font-semibold text-charcoal hover:underline"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                          >
                            sign in
                          </Link>
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Regular For You Section (Authenticated Users) */
                    <>
                      {forYouLoading ? (
                        <BusinessRowSkeleton title="For You Now" />
                      ) : forYouError ? (
                      <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-coral">
                        Couldn't load personalized picks right now. We'll retry in the background.
                      </div>
                      ) : forYouBusinesses.length > 0 ? (
                        <MemoizedBusinessRow 
                          title="For You" 
                          businesses={forYouBusinesses} 
                          cta="See More" 
                          href="/for-you" 
                        />
                      ) : (
                        // ✅ Show helpful message when personalized query returns 0 (instead of hiding)
                        <div className="mx-auto w-full max-w-[2000px] px-2 py-4">
                          <div className="bg-sage/10 border border-sage/30 rounded-lg p-6 text-center">
                            <p className="text-body text-charcoal/70 mb-2">
                              We're still learning your taste
                            </p>
                            <p className="text-body-sm text-charcoal/70">
                              Explore a bit and we'll personalize more recommendations for you.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {/* Show skeleton while prefs are loading */}
              {!isFiltered && !isSearchActive && prefsLoading && (
                <div className="relative z-10 snap-start">
                  <BusinessRowSkeleton title="For You Now" />
                </div>
              )}

              {/* ✅ Filtered Results Section - Show when filters are active */}
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
                    <MemoizedBusinessRow title="Trending Now" businesses={trendingBusinesses} cta="See More" href="/trending" />
                  )}
                  {!trendingLoading && !hasTrendingBusinesses && !trendingError && (
                    <MemoizedBusinessRow title="Trending Now" businesses={[]} cta="See More" href="/trending" />
                  )}
                  {trendingError && !trendingLoading && (
                    <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-coral">
                      Trending businesses are still loading. Refresh to try again.
                    </div>
                  )}
                </div>
              )}

              {/* Events & Specials */}
              <div className="relative z-10 snap-start">
                <EventsSpecials 
                  events={events.length > 0 ? events : []} 
                  loading={eventsLoading}
                />
              </div>

              {/* Community Highlights */}
              <div className="relative z-10 snap-start">
                {allBusinessesLoading ? (
                  <FeaturedBusinessesSkeleton count={4} />
                ) : (
                  <CommunityHighlights
                    businessesOfTheMonth={featuredByCategory}
                    variant="reviews"
                  />
                )}
              </div>
            </div>
          )}
          </AnimatePresence>
        </div>
      </main>
      <ScrollHint />
      <Footer />

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
      </div>
    </>
  );
}