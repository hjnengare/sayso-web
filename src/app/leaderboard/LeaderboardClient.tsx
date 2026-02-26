// src/app/leaderboard/page.tsx
"use client";

import { useState, useMemo, memo, useEffect } from "react";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import { ChevronRight, ChevronLeft, Award, FileText, ExternalLink } from "lucide-react";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import LeaderboardPodium from "../components/Leaderboard/LeaderboardPodium";
import LeaderboardList from "../components/Leaderboard/LeaderboardList";
import LeaderboardTitle from "../components/Leaderboard/LeaderboardTitle";
import { Tabs } from "@/components/atoms/Tabs";
import { Loader } from "../components/Loader/Loader";
import WavyTypedTitle from "@/app/components/Animations/WavyTypedTitle";

// Dynamically import BusinessOfMonthLeaderboard to improve initial load time
const BusinessOfMonthLeaderboard = nextDynamic(
  () => import("../components/Leaderboard/BusinessOfMonthLeaderboard"),
  {
    loading: () => null,
    ssr: false,
  }
);
import { useBusinesses } from "../hooks/useBusinesses";
import { useFeaturedBusinesses } from "../hooks/useFeaturedBusinesses";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { LiveIndicator } from "../components/Realtime/RealtimeIndicators";

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
  const isDesktop = useIsDesktop();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl === 'businesses' ? 'businesses' : 'contributors';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [showFullBusinessLeaderboard, setShowFullBusinessLeaderboard] = useState(false);
  const [shouldFetchBusinesses, setShouldFetchBusinesses] = useState(false);
  const { topReviewers, isLoadingLeaderboard, leaderboardError, isRealtimeConnected, refetch: refetchLeaderboard } =
    useLeaderboard(activeTab === 'contributors');

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

  // Fetch real businesses only when businesses tab is active or has been viewed
  // Reduced limit from 200 to 50 - we only need one business per interest category (max ~8)
  const { businesses: allBusinesses } = useBusinesses({
    limit: 50,
    sortBy: "total_rating",
    sortOrder: "desc",
    feedStrategy: "mixed",
    skip: !shouldFetchBusinesses,
  });

  // Fetch featured businesses from API
  const { featuredBusinesses } = useFeaturedBusinesses({
    limit: 50, // More for leaderboard
    skip: !shouldFetchBusinesses,
  });

  // Trigger business fetch when switching to businesses tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "businesses" && !shouldFetchBusinesses) {
      setShouldFetchBusinesses(true);
    }
  };

  // Use featured businesses from API instead of client-side computation
  const featuredBusinessesFromAPI = featuredBusinesses;

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -20,
      transition: {
        duration: 0.3,
      },
    },
  };

  const contentClassName = "min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white";

  return (
    <EmailVerificationGuard>
      <div className="min-h-dvh bg-off-white relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

        <m.div 
          className={contentClassName}
          variants={isDesktop ? containerVariants : undefined}
          initial={isDesktop ? "hidden" : false}
          animate={isDesktop ? "visible" : undefined}
        >
              {/* Hero Section */}
                <section className="relative z-10 pb-6 sm:pb-8 md:pb-12">
                  <div className="mx-auto w-full max-w-[2000px] px-2">
                    {/* Breadcrumb */}
                    <m.nav 
                      className="pb-1" 
                      aria-label="Breadcrumb"
                      variants={isDesktop ? itemVariants : undefined}
                      initial={isDesktop ? "hidden" : false}
                      animate={isDesktop ? "visible" : undefined}
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
                            Leaderboard
                          </span>
                        </li>
                      </ol>
                    </m.nav>

                    {/* Title and Description Block */}
                    <m.div 
                      className="mb-10 sm:mb-12 px-4 sm:px-6 text-center pt-4"
                      variants={isDesktop ? itemVariants : undefined}
                      initial={isDesktop ? "hidden" : false}
                      animate={isDesktop ? "visible" : undefined}
                    >
                      {isRealtimeConnected && activeTab === 'contributors' && (
                        <div className="flex justify-center mb-4">
                          <LiveIndicator isLive={isRealtimeConnected} />
                        </div>
                      )}
                      <div className="my-4 relative">
                        <h1 
                          className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-[1.2] tracking-tight text-charcoal mx-auto font-urbanist"
                          style={{ 
                            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
                            disableWave={true}
                            enableScrollTrigger={true}
                            style={{
                              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              fontWeight: 800,
                              wordBreak: 'keep-all',
                              overflowWrap: 'break-word',
                              whiteSpace: 'normal',
                              hyphens: 'none',
                            }}
                          />
                        </h1>
                      </div>
                      <m.p 
                        className="text-sm sm:text-base text-charcoal/70 max-w-2xl mx-auto leading-relaxed" 
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        variants={isDesktop ? itemVariants : undefined}
                        initial={isDesktop ? "hidden" : false}
                        animate={isDesktop ? "visible" : undefined}
                      >
                        Celebrate the top contributors and businesses in our community. 
                        See who's making a difference and discover the most loved local spots.
                      </m.p>
                    </m.div>
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
                        <m.div 
                          className="flex justify-center pt-2 mb-8 px-2"
                          variants={isDesktop ? itemVariants : undefined}
                          initial={isDesktop ? "hidden" : false}
                          animate={isDesktop ? "visible" : undefined}
                        >
                          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
                        </m.div>

                      {/* Leaderboard Content */}
                        <AnimatePresence mode="wait">
                          <m.div
                            key={activeTab}
                            variants={isDesktop ? cardVariants : undefined}
                            initial={isDesktop ? "hidden" : false}
                            animate={isDesktop ? "visible" : undefined}
                            exit={isDesktop ? "exit" : undefined}
                            className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md  rounded-[12px] ring-1 ring-white/20 shadow-md p-3 sm:p-4 md:p-6 lg:p-8 mb-6 sm:mb-8 md:mb-12 relative overflow-hidden"
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
                                      onClick={refetchLeaderboard}
                                      className="px-4 py-2 bg-card-bg text-white rounded-full text-sm font-semibold hover:bg-card-bg/90 transition-colors"
                                    >
                                      Retry
                                    </button>
                                  </div>
                                ) : topReviewers.length === 0 ? (
                                  <div className="text-center py-12">
                                    <div className="flex flex-col items-center gap-4">
                                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-off-white rounded-xl flex items-center justify-center p-4">
                                        <Award className="w-8 h-8 sm:w-10 sm:h-10 text-charcoal/60" strokeWidth={2} />
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
                                businesses={featuredBusinessesFromAPI}
                                showFullLeaderboard={showFullBusinessLeaderboard}
                                onToggleFullLeaderboard={handleToggleFullBusinessLeaderboard}
                              />
                            )}
                          </div>
                        </m.div>
                        </AnimatePresence>
                    </div>
                  </div>
                </section>
        </m.div>

        {/* Badge Definitions Section - Before Footer */}
        <section className="relative z-50 py-4 sm:py-8 bg-navbar-bg">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <div className="text-center sm:text-left">
                <h3
                  className="text-lg sm:text-xl font-semibold text-white mb-1"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  What Do Your Badges Mean?
                </h3>
                <p
                  className="text-sm text-white/60"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  Learn about all the badges you can earn
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Badge Guide button - Opens in new tab */}
                <a
                  href="/badges"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-white text-navbar-bg hover:bg-white/90 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">View badge guide</span>
                  <span className="sm:hidden">View</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </EmailVerificationGuard>
  );
}

export default memo(LeaderboardPage);
