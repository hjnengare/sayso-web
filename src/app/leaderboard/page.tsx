// src/app/leaderboard/page.tsx
"use client";

import { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import Header from "../components/Header/Header";
import LeaderboardPodium from "../components/Leaderboard/LeaderboardPodium";
import LeaderboardList from "../components/Leaderboard/LeaderboardList";
import LeaderboardTitle from "../components/Leaderboard/LeaderboardTitle";
import { Tabs } from "@/components/atoms/Tabs";
import StaggeredContainer from "../components/Animations/StaggeredContainer";
import AnimatedElement from "../components/Animations/AnimatedElement";

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

// Memoized leaderboard data to prevent recreation on every render
const topReviewers: LeaderboardUser[] = [
  { rank: 1, username: "Observer", reviews: 25, badge: "🥇", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.9, id: "1" },
  { rank: 2, username: "Ghost", reviews: 20, badge: "🥈", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.8, id: "2" },
  { rank: 3, username: "Reviewer", reviews: 15, badge: "🥉", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.7, id: "3" },
  { rank: 4, username: "LocalGuru", reviews: 12, avatar: "https://images.unsplash.com/photo-1494790108755-2616b332e234?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.6, id: "4" },
  { rank: 5, username: "TasteExplorer", reviews: 10, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.5, id: "5" },
  { rank: 6, username: "CityScout", reviews: 8, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.4, id: "6" },
  { rank: 7, username: "GemHunter", reviews: 7, avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.3, id: "7" },
  { rank: 8, username: "ReviewMaster", reviews: 6, avatar: "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.2, id: "8" },
  { rank: 9, username: "FoodieLife", reviews: 5, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.1, id: "9" },
  { rank: 10, username: "UrbanExplorer", reviews: 5, avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 4.0, id: "10" },
  { rank: 11, username: "TrendSetter", reviews: 4, avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 3.9, id: "11" },
  { rank: 12, username: "NightOwl", reviews: 4, avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 3.8, id: "12" },
  { rank: 13, username: "VibeChecker", reviews: 3, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 3.7, id: "13" },
  { rank: 14, username: "QualityFirst", reviews: 3, avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 3.6, id: "14" },
  { rank: 15, username: "StyleHunter", reviews: 2, avatar: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150", totalRating: 3.5, id: "15" }
];

function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("contributors");
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [showFullBusinessLeaderboard, setShowFullBusinessLeaderboard] = useState(false);
  const [shouldFetchBusinesses, setShouldFetchBusinesses] = useState(false);

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

        <StaggeredContainer>
          <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
            <div className="py-1 pt-20">
              {/* Hero Section */}
              <AnimatedElement index={0} direction="top">
                <section className="relative z-10 pb-6 sm:pb-8 md:pb-12">
                  <div className="mx-auto w-full max-w-[2000px] px-2">
                    {/* Breadcrumb */}
                    <nav className="px-2 py-4" aria-label="Breadcrumb">
                      <ol className="flex items-center gap-1 text-body-sm text-charcoal/60">
                        <li>
                          <Link href="/home" className="hover:text-charcoal transition-colors font-urbanist">
                            Home
                          </Link>
                        </li>
                        <li className="text-charcoal/40">/</li>
                        <li className="text-charcoal font-medium font-urbanist">Community Highlights</li>
                      </ol>
                    </nav>
                  </div>
                </section>
              </AnimatedElement>

              {/* Main Content Section */}
              <AnimatedElement index={1} direction="scale">
                <section
                  className="relative pb-12 sm:pb-16 md:pb-20"
                  style={{
                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  }}
                >
                  <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
                    <div className="max-w-[800px] mx-auto pt-4 sm:pt-6 md:pt-8">

                      {/* Tabs */}
                      <AnimatedElement index={2} direction="left">
                        <div className="flex justify-center mb-4 sm:mb-6 md:mb-8 px-2">
                          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
                        </div>
                      </AnimatedElement>

                      {/* Leaderboard Content */}
                      <AnimatedElement index={3} direction="right">
                        <motion.div
                          key={activeTab}
                          className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-xl ring-1 ring-white/20 p-3 sm:p-4 md:p-6 lg:p-8 mb-6 sm:mb-8 md:mb-12 relative overflow-hidden"
                        >
                          {/* Card decorative elements */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>

                          <div className="relative z-10">
                            {activeTab === "contributors" ? (
                              <>
                                {/* Podium - visible on all screens */}
                                <LeaderboardPodium topReviewers={topReviewers} />
                                <LeaderboardList
                                  users={topReviewers}
                                  showFullLeaderboard={showFullLeaderboard}
                                  onToggleFullLeaderboard={handleToggleFullLeaderboard}
                                />
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
                      </AnimatedElement>
                    </div>
                  </div>
                </section>
              </AnimatedElement>
            </div>

            <AnimatedElement index={4} direction="bottom">
              <Footer />
            </AnimatedElement>
          </div>
        </StaggeredContainer>
      </div>
    </EmailVerificationGuard>
  );
}

export default memo(LeaderboardPage);
