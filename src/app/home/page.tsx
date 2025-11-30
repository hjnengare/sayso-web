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
import HomeBackgroundOrbs from "../components/Home/HomeBackgroundOrbs";
import { EVENTS_AND_SPECIALS } from "../data/eventsData";
import {
  FEATURED_REVIEWS,
  TOP_REVIEWERS,
} from "../data/communityHighlightsData";
import { useBusinesses, useForYouBusinesses, useTrendingBusinesses } from "../hooks/useBusinesses";
import { useRoutePrefetch } from "../hooks/useRoutePrefetch";

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
    loading: () => <div className="h-96 bg-off-white/50" />,
  }
);

const Footer = nextDynamic(() => import("../components/Footer/Footer"), {
  loading: () => <div className="h-64 bg-charcoal" />,
});

const MemoizedBusinessRow = memo(BusinessRow);

export default function Home() {
  usePredefinedPageTitle('home');
  const { businesses: forYouBusinesses, loading: forYouLoading, error: forYouError } = useForYouBusinesses(10);
  const { businesses: trendingBusinesses, loading: trendingLoading, error: trendingError } = useTrendingBusinesses(10);
  const { businesses: allBusinesses } = useBusinesses({ limit: 200, sortBy: "total_rating", sortOrder: "desc", feedStrategy: "mixed" });

  // Note: Prioritization of recently reviewed businesses is now handled on the backend
  // The API automatically prioritizes businesses the user has reviewed within the last 24 hours

  // Scroll to top button state (mobile only)
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

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

  const handleSubmitQuery = (query: string) => {
    console.log("home search query:", query);
    if (isFilterVisible) closeFilters();
  };

  const featuredByCategory = (() => {
    if (!allBusinesses || !Array.isArray(allBusinesses) || allBusinesses.length === 0) return [];

    const byCategory = new Map<string, any>();

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

    for (const b of allBusinesses) {
      const cat = (b.category || "Business") as string;
      const existing = byCategory.get(cat);
      if (!existing || getDisplayRating(b) > getDisplayRating(existing)) {
        byCategory.set(cat, b);
      }
    }

    const results = Array.from(byCategory.entries()).map(([cat, b]) => {
      const rating = getDisplayRating(b);
      const reviews = getReviews(b);
      const categoryLabel = toTitle(b.subInterestLabel || cat);
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
    <div className="min-h-dvh bg-off-white relative overflow-hidden" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
      {/* Premium floating orbs background */}
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
          <div ref={searchWrapRef} className="py-4 px-4">
            <SearchInput
              variant="header"
              placeholder="Discover exceptional local hidden gems..."
              mobilePlaceholder="Search places, coffee, yoga…"
              onSearch={(q) => console.log("home search change:", q)}
              onSubmitQuery={handleSubmitQuery}
              onFilterClick={openFilters}
              onFocusOpenFilters={openFilters}
              showFilter
            />
          </div>

          <div className="py-4">
            {/* For You Section */}
            <section className="pt-4 sm:pt-8 md:pt-10 relative overflow-hidden">
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
            </section>

            <section className="pt-4 sm:pt-8 md:pt-10 relative overflow-hidden">
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
            </section>

            <section className="pt-4 sm:pt-8 md:pt-10 relative overflow-hidden">
              <div className="relative z-10">
                <EventsSpecials events={EVENTS_AND_SPECIALS.slice(0, 5)} />
              </div>
            </section>

            <section className="pt-4 sm:pt-8 md:pt-10 relative overflow-hidden">
              <div className="relative z-10">
                <CommunityHighlights
                  reviews={FEATURED_REVIEWS}
                  topReviewers={TOP_REVIEWERS}
                  businessesOfTheMonth={featuredByCategory}
                  variant="reviews"
                />
              </div>
            </section>
          </div>
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
  );
}