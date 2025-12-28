// ================================
// File: src/app/Home.tsx
// Description: Home page with ALL scroll-reveal removed
// ================================

"use client";

import { memo, useState, useEffect, useMemo, useRef } from "react";
import nextDynamic from "next/dynamic";
import { ChevronUp } from "react-feather";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import Header from "../components/Header/Header";
import SearchInput from "../components/SearchInput/SearchInput";
import FilterModal, { FilterState } from "../components/FilterModal/FilterModal";
import HeroCarousel from "../components/Hero/HeroCarousel";
import BusinessRow from "../components/BusinessRow/BusinessRow";
import BusinessRowSkeleton from "../components/BusinessRow/BusinessRowSkeleton";
import FeaturedBusinessesSkeleton from "../components/CommunityHighlights/FeaturedBusinessesSkeleton";
import HomeBackgroundOrbs from "../components/Home/HomeBackgroundOrbs";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import { Loader } from "../components/Loader/Loader";
import {
  FEATURED_REVIEWS,
  TOP_REVIEWERS,
} from "../data/communityHighlightsData";
import { useBusinesses, useForYouBusinesses, useTrendingBusinesses } from "../hooks/useBusinesses";
import { useEvents } from "../hooks/useEvents";
import { useRoutePrefetch } from "../hooks/useRoutePrefetch";
import { useDebounce } from "../hooks/useDebounce";
import { useUserPreferences } from "../hooks/useUserPreferences";
import CategoryFilterPills from "../components/Home/CategoryFilterPills";

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

const floatingOrbStyles = `
  @media (prefers-reduced-motion: reduce) {
    .floating-orb { animation: none !important; opacity: 0.2 !important; }
  }

  /* Premium floating orbs */
  @keyframes float1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -30px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }

  @keyframes float2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(-40px, 40px) scale(0.95); }
    66% { transform: translate(25px, -25px) scale(1.05); }
  }

  @keyframes float3 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(35px, 35px) scale(1.08); }
  }

  @keyframes float4 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-30px, -30px) scale(0.92); }
  }

  @keyframes float5 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(20px, -40px) scale(1.06); }
    75% { transform: translate(-25px, 30px) scale(0.94); }
  }

  .floating-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;
    z-index: 0;
    opacity: 0.4;
  }

  .floating-orb-1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(157, 171, 155, 0.6) 0%, rgba(157, 171, 155, 0.2) 50%, transparent 100%);
    top: 10%;
    left: 5%;
    animation: float1 20s ease-in-out infinite;
  }

  .floating-orb-2 {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(125, 15, 42, 0.5) 0%, rgba(125, 15, 42, 0.2) 50%, transparent 100%);
    top: 60%;
    right: 8%;
    animation: float2 25s ease-in-out infinite;
  }

  .floating-orb-3 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(157, 171, 155, 0.45) 0%, rgba(157, 171, 155, 0.15) 50%, transparent 100%);
    bottom: 15%;
    left: 10%;
    animation: float3 18s ease-in-out infinite;
  }

  .floating-orb-4 {
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, rgba(125, 15, 42, 0.4) 0%, rgba(125, 15, 42, 0.15) 50%, transparent 100%);
    top: 30%;
    right: 15%;
    animation: float4 22s ease-in-out infinite;
  }

  .floating-orb-5 {
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(157, 171, 155, 0.5) 0%, rgba(157, 171, 155, 0.2) 50%, transparent 100%);
    bottom: 25%;
    right: 5%;
    animation: float5 24s ease-in-out infinite;
  }

  .floating-orb-6 {
    width: 160px;
    height: 160px;
    background: radial-gradient(circle, rgba(125, 15, 42, 0.35) 0%, rgba(125, 15, 42, 0.12) 50%, transparent 100%);
    top: 50%;
    left: 2%;
    animation: float1 19s ease-in-out infinite reverse;
  }

  @media (max-width: 768px) {
    .floating-orb {
      filter: blur(40px);
      opacity: 0.3;
    }
    .floating-orb-1 { width: 200px; height: 200px; }
    .floating-orb-2 { width: 180px; height: 180px; }
    .floating-orb-3 { width: 150px; height: 150px; }
    .floating-orb-4 { width: 140px; height: 140px; }
    .floating-orb-5 { width: 160px; height: 160px; }
    .floating-orb-6 { width: 120px; height: 120px; }
  }
`;

export default function Home() {
  usePredefinedPageTitle('home');
  
  // Scroll to top button state (mobile only)
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const { interests, subcategories } = useUserPreferences();

  // Debounce search query for real-time filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Debug logging for user preferences
  useEffect(() => {
    console.log("[Home] user prefs:", { interestsLen: interests.length, interests, subcategoriesLen: subcategories.length });
  }, [interests, subcategories]);

  // Initialize selected interests with user's interests on mount
  useEffect(() => {
    if (interests.length > 0 && selectedInterestIds.length === 0) {
      setSelectedInterestIds(interests.map(i => i.id));
    }
  }, [interests, selectedInterestIds.length]);

  // Determine sort strategy based on search query
  const sortStrategy = useMemo((): 'relevance' | 'distance' | 'rating_desc' | 'price_asc' | 'combo' | undefined => {
    if (debouncedSearchQuery.trim().length > 0) {
      return 'relevance'; // Use relevance sorting when searching
    }
    return undefined; // Use default sorting
  }, [debouncedSearchQuery]);

  // Combine selected interests with subcategories for filtering
  const activeInterestIds = useMemo(() => {
    // Use selected interest IDs if any are selected
    if (selectedInterestIds.length > 0) {
      return selectedInterestIds;
    }
    // If no interests are selected, don't filter by interests (show all)
    return undefined;
  }, [selectedInterestIds]);

  const { businesses: forYouBusinesses, loading: forYouLoading, error: forYouError } = useForYouBusinesses(10, activeInterestIds);
  const { businesses: trendingBusinesses, loading: trendingLoading, error: trendingError } = useTrendingBusinesses(10, { interestIds: activeInterestIds });
  const { events, loading: eventsLoading } = useEvents({ limit: 5, upcoming: true });
  const { businesses: allBusinesses, loading: allBusinessesLoading } = useBusinesses({ 
    limit: 500, // Increased to ensure we get businesses from more subcategories
    sortBy: "total_rating", 
    sortOrder: "desc", 
    feedStrategy: debouncedSearchQuery.trim().length > 0 ? "standard" : "mixed",
    searchQuery: debouncedSearchQuery.trim().length > 0 ? debouncedSearchQuery : null,
    sort: sortStrategy,
    interestIds: activeInterestIds,
  });

  // Check if search is active
  const isSearchActive = debouncedSearchQuery.trim().length > 0;
  
  // Limit search results to 12 items
  const searchResults = useMemo(() => {
    if (!isSearchActive) return [];
    return allBusinesses.slice(0, 12);
  }, [allBusinesses, isSearchActive]);

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
    console.log("home filters:", f);
    closeFilters();
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSubmitQuery = (query: string) => {
    setSearchQuery(query);
    if (isFilterVisible) closeFilters();
  };

  const handleToggleInterest = (interestId: string) => {
    setSelectedInterestIds(prev => {
      if (prev.includes(interestId)) {
        // Deselect - remove from array
        return prev.filter(id => id !== interestId);
      } else {
        // Select - add to array
        return [...prev, interestId];
      }
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

    const results = Array.from(bySubCategory.entries()).map(([subCat, b]) => {
      const rating = getDisplayRating(b);
      const reviews = getReviews(b);
      const categoryLabel = toTitle(b.subInterestLabel || b.subInterestId || b.category || subCat);
      return {
        id: b.id,
        name: b.name,
        image: b.image || b.image_url || b.uploaded_image || b.uploadedImage || "",
        alt: b.alt || b.name,
        category: b.category || "Business",
        location: b.location || b.address || "Cape Town",
        rating: rating > 0 ? 5 : 0,
        totalRating: rating,
        reviews,
        badge: "featured" as const,
        href: `/business/${b.slug || b.id}`,
        monthAchievement: `Featured ${categoryLabel}`,
        verified: Boolean(b.verified),
      };
    });

    results.sort((a, b) => b.totalRating - a.totalRating || b.reviews - a.reviews);
    return results;
  })();
  useRoutePrefetch([
    "/for-you",
    "/trending",
    "/discover/reviews",
    "/events-specials",
    "/explore",
    "/write-review",
    "/saved",
  ]);
  const hasForYouBusinesses = forYouBusinesses.length > 0;
  const hasTrendingBusinesses = trendingBusinesses.length > 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: floatingOrbStyles }} />
      <div className="min-h-dvh bg-off-white relative overflow-hidden" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        {/* Premium floating orbs background */}
        <div className="floating-orb floating-orb-1" aria-hidden="true" />
        <div className="floating-orb floating-orb-2" aria-hidden="true" />
        <div className="floating-orb floating-orb-3" aria-hidden="true" />
        <div className="floating-orb floating-orb-4" aria-hidden="true" />
        <div className="floating-orb floating-orb-5" aria-hidden="true" />
        <div className="floating-orb floating-orb-6" aria-hidden="true" />
        <HomeBackgroundOrbs />

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

      <main className="bg-off-white relative pt-20 sm:pt-24 pb-16">
        <div className="mx-auto w-full max-w-[2000px]">
          {/* Search Input at top of home content */}
          <div ref={searchWrapRef} className="py-8 px-4 sm:px-6">
            <SearchInput
              variant="header"
              placeholder="Discover exceptional local hidden gems..."
              mobilePlaceholder="Search places, coffee, yoga…"
              onSearch={handleSearchChange}
              onSubmitQuery={handleSubmitQuery}
              onFilterClick={openFilters}
              onFocusOpenFilters={openFilters}
              showFilter
            />
          </div>

          {/* Category Filter Pills - positioned directly underneath search input, styled like FilterTabs */}
          <div className="py-4 px-4 sm:px-6">
            <CategoryFilterPills
              selectedCategoryIds={selectedInterestIds}
              onToggleCategory={handleToggleInterest}
            />
          </div>

          {isSearchActive ? (
            /* Search Results View - Styled like Explore page */
            <div className="py-3 sm:py-4">
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
                    {/* Show search status */}
                    <div className="mb-4 px-2 text-sm text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for "{debouncedSearchQuery}"
                    </div>
                    {/* Search Results Grid - Styled like Explore page */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-3">
                      {searchResults.map((business) => (
                        <div key={business.id} className="list-none">
                          <BusinessCard business={business} compact inGrid={true} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Default Home Page Content */
            <div className="flex flex-col gap-8 sm:gap-10 md:gap-12 pt-8">
              {/* For You Section */}
              <div className="relative z-10">
                {forYouLoading && <BusinessRowSkeleton title="For You Now" />}
                {!forYouLoading && hasForYouBusinesses && (
                  <MemoizedBusinessRow title="For You Now" businesses={forYouBusinesses} cta="See More" href="/for-you" />
                )}
                {!forYouLoading && !hasForYouBusinesses && !forYouError && (
                  <MemoizedBusinessRow title="For You Now" businesses={[]} cta="See More" href="/for-you" />
                )}
                {forYouError && !forYouLoading && (
                  <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-coral">
                    Couldn't load personalized picks right now. We'll retry in the background.
                  </div>
                )}
              </div>

              {/* Trending Section */}
              <div className="relative z-10">
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

              {/* Events & Specials */}
              <div className="relative z-10">
                <EventsSpecials 
                  events={events.length > 0 ? events : []} 
                  loading={eventsLoading}
                />
              </div>

              {/* Community Highlights */}
              <div className="relative z-10">
                {allBusinessesLoading ? (
                  <FeaturedBusinessesSkeleton count={4} />
                ) : (
                  <CommunityHighlights
                    reviews={FEATURED_REVIEWS}
                    topReviewers={TOP_REVIEWERS}
                    businessesOfTheMonth={featuredByCategory}
                    variant="reviews"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      {/* Anchored Filter Modal for home search */}
      <FilterModal
        isOpen={isFilterOpen}
        isVisible={isFilterVisible}
        onClose={closeFilters}
        onApplyFilters={handleApplyFilters}
        anchorRef={searchWrapRef}
      />

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