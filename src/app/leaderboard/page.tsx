// src/app/leaderboard/page.tsx
"use client";

import { useState, useMemo, memo, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import { Fontdiner_Swanky } from "next/font/google";
import { ChevronRight, Award } from "react-feather";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import Header from "../components/Header/Header";
import LeaderboardPodium from "../components/Leaderboard/LeaderboardPodium";
import LeaderboardList from "../components/Leaderboard/LeaderboardList";
import LeaderboardTitle from "../components/Leaderboard/LeaderboardTitle";
import { Tabs } from "@/components/atoms/Tabs";
import { Loader } from "../components/Loader/Loader";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Dynamically import BusinessOfMonthLeaderboard to improve initial load time
const BusinessOfMonthLeaderboard = nextDynamic(
  () => import("../components/Leaderboard/BusinessOfMonthLeaderboard"),
  {
    loading: () => null,
    ssr: false,
  }
);
import { useBusinesses } from "../hooks/useBusinesses";

// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

const Footer = nextDynamic(() => import("../components/Footer/Footer"), {
  loading: () => null,
  ssr: false,
});

interface LeaderboardUser {
  rank: number;
  username: string;
  reviews: number;
  badge?: string;
  avatar: string;
  totalRating: number;
  id?: string;
}

function LeaderboardPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl === 'businesses' ? 'businesses' : 'contributors';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [showFullBusinessLeaderboard, setShowFullBusinessLeaderboard] = useState(false);
  const [shouldFetchBusinesses, setShouldFetchBusinesses] = useState(false);
  const [topReviewers, setTopReviewers] = useState<LeaderboardUser[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Update active tab when URL param changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'businesses' || tabFromUrl === 'contributors') {
      setActiveTab(tabFromUrl);
      if (tabFromUrl === 'businesses' && !shouldFetchBusinesses) {
        setShouldFetchBusinesses(true);
      }
    }
  }, [searchParams, shouldFetchBusinesses]);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      setLeaderboardError(null);
      
      try {
        const response = await fetch('/api/leaderboard?limit=50&sortBy=reviews');
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        
        const data = await response.json();
        setTopReviewers(data.leaderboard || []);
      } catch (error: any) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboardError(error.message || 'Failed to load leaderboard');
        // Fallback to empty array on error
        setTopReviewers([]);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };

    if (activeTab === "contributors") {
      fetchLeaderboard();
    }
  }, [activeTab]);

  // Fetch real businesses only when businesses tab is active or has been viewed
  // Reduced limit from 200 to 50 - we only need one business per interest category (max ~8)
  const { businesses: allBusinesses } = useBusinesses({
    limit: 50,
    sortBy: "total_rating",
    sortOrder: "desc",
    feedStrategy: "mixed",
    skip: !shouldFetchBusinesses,
  });

  // Trigger business fetch when switching to businesses tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "businesses" && !shouldFetchBusinesses) {
      setShouldFetchBusinesses(true);
    }
  };

  const featuredBusinesses = useMemo(() => {
    if (!allBusinesses || allBusinesses.length === 0) return [];

    const byInterest = new Map<string, any>();

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
      // Group by interestId instead of category
      const interestId = (b.interestId || "uncategorized") as string;
      const existing = byInterest.get(interestId);
      if (!existing || getDisplayRating(b) > getDisplayRating(existing)) {
        byInterest.set(interestId, b);
      }
    }

    const results = Array.from(byInterest.entries()).map(([interestId, b]) => {
      const rating = getDisplayRating(b);
      const reviews = getReviews(b);
      const interestLabel = toTitle(interestId);
      return {
        id: b.id,
        name: b.name,
        image: b.image || b.image_url || b.uploaded_image || b.uploadedImage || "",
        alt: b.alt || b.name,
        category: b.category || "Business",
        interestId: interestId,
        location: b.location || b.address || "Cape Town",
        rating: rating > 0 ? 5 : 0,
        totalRating: rating,
        reviews,
        badge: "featured" as const,
        href: `/business/${b.slug || b.id}`,
        monthAchievement: `Featured ${interestLabel}`,
        verified: Boolean(b.verified),
      };
    });

    results.sort((a, b) => b.totalRating - a.totalRating || b.reviews - a.reviews);
    return results;
  }, [allBusinesses]);

  // Memoize the toggle functions to prevent unnecessary re-renders
  const handleToggleFullLeaderboard = useMemo(() =>
    () => setShowFullLeaderboard(!showFullLeaderboard),
    [showFullLeaderboard]
  );

  const handleToggleFullBusinessLeaderboard = useMemo(() =>
    () => setShowFullBusinessLeaderboard(!showFullBusinessLeaderboard),
    [showFullBusinessLeaderboard]
  );

  const tabs = [
    { id: "contributors", label: "Top Contributors" },
    { id: "businesses", label: "Top Businesses" },
  ];

  return (
    <EmailVerificationGuard>
      <div className="min-h-dvh bg-off-white">
        <Header
          showSearch={true}
          variant="white"
          backgroundClassName="bg-navbar-bg"
          topPosition="top-0"
          reducedPadding={true}
          whiteText={true}
        />

        <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
            <div className="pt-20 sm:pt-24">
              {/* Hero Section */}
                <section className="relative z-10 pb-6 sm:pb-8 md:pb-12">
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
                            Community Highlights
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
                            text="Community Highlights"
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
                        Celebrate the top contributors and businesses in our community. 
                        See who's making a difference and discover the most loved local spots.
                      </p>
                    </div>
                  </div>
                </section>

              {/* Main Content Section */}
                <section
                  className="relative pb-12 sm:pb-16 md:pb-20"
                  style={{
                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  }}
                >
                  <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
                    <div className="max-w-[800px] mx-auto pt-4 sm:pt-6 md:pt-8">

                      {/* Tabs */}
                        <div className="flex justify-center mb-4 sm:mb-6 md:mb-8 px-2">
                          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
                        </div>

                      {/* Leaderboard Content */}
                        <motion.div
                          key={activeTab}
                          className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 p-3 sm:p-4 md:p-6 lg:p-8 mb-6 sm:mb-8 md:mb-12 relative overflow-hidden"
                        >
                          {/* Card decorative elements */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>

                          <div className="relative z-10">
                            {activeTab === "contributors" ? (
                              <>
                                {isLoadingLeaderboard ? (
                                  <div className="flex items-center justify-center py-12">
                                    <Loader size="md" variant="wavy" color="sage" />
                                  </div>
                                ) : leaderboardError ? (
                                  <div className="text-center py-12">
                                    <p className="text-charcoal/70 mb-4">{leaderboardError}</p>
                                    <button
                                      onClick={() => {
                                        setLeaderboardError(null);
                                        setIsLoadingLeaderboard(true);
                                        fetch('/api/leaderboard?limit=50&sortBy=reviews')
                                          .then(res => res.json())
                                          .then(data => {
                                            setTopReviewers(data.leaderboard || []);
                                            setIsLoadingLeaderboard(false);
                                          })
                                          .catch(err => {
                                            setLeaderboardError(err.message);
                                            setIsLoadingLeaderboard(false);
                                          });
                                      }}
                                      className="px-4 py-2 bg-sage text-white rounded-full text-sm font-semibold hover:bg-sage/90 transition-colors"
                                    >
                                      Retry
                                    </button>
                                  </div>
                                ) : topReviewers.length === 0 ? (
                                  <div className="text-center py-12">
                                    <div className="flex flex-col items-center gap-4">
                                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-sage/20 to-sage/10 rounded-full flex items-center justify-center border border-sage/30">
                                        <Award className="w-8 h-8 sm:w-10 sm:h-10 text-navbar-bg" strokeWidth={2} />
                                      </div>
                                      <p className="text-charcoal/70 text-body-sm sm:text-body">No contributors yet. Be the first to write a review!</p>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Podium - visible on all screens */}
                                    <LeaderboardPodium topReviewers={topReviewers} />
                                    <LeaderboardList
                                      users={topReviewers}
                                      showFullLeaderboard={showFullLeaderboard}
                                      onToggleFullLeaderboard={handleToggleFullLeaderboard}
                                    />
                                  </>
                                )}
                              </>
                            ) : (
                              <BusinessOfMonthLeaderboard
                                businesses={featuredBusinesses}
                                showFullLeaderboard={showFullBusinessLeaderboard}
                                onToggleFullLeaderboard={handleToggleFullBusinessLeaderboard}
                              />
                            )}
                          </div>
                        </motion.div>
                    </div>
                  </div>
                </section>
            </div>

            <Footer />
          </div>
      </div>
    </EmailVerificationGuard>
  );
}

export default memo(LeaderboardPage);
