// src/components/CommunityHighlights/CommunityHighlights.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useReviewersTop } from "../../hooks/useReviewersTop";
import { useRecentReviews } from "../../hooks/useRecentReviews";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import ReviewerCard from "../ReviewerCard/ReviewerCard";
import BusinessOfTheMonthCard from "../BusinessCard/BusinessOfTheMonthCard";
import ScrollableSection from "../ScrollableSection/ScrollableSection";
import { motion } from "framer-motion";
import LocationPromptBanner from "../Location/LocationPromptBanner";
import CommunityHighlightsSkeleton from "./CommunityHighlightsSkeleton";
import { useIsDesktop } from "../../hooks/useIsDesktop";
import {
  Review,
  Reviewer,
  BusinessOfTheMonth,
} from "../../types/community";
import { BADGE_MAPPINGS } from "../../lib/badgeMappings";

const badgePreviewIds = [
  { id: "milestone_new_voice", icon: "✍️" },
  { id: "community_neighbourhood_plug", icon: "🏆" },
  { id: "community_hidden_gem_hunter", icon: "💎" },
  { id: "milestone_helpful_honeybee", icon: "⚡" },
  { id: "milestone_consistency_star", icon: "✅" },
  { id: "explorer_variety_voyager", icon: "🗺️" },
] as const;

const badgePreviews = badgePreviewIds
  .map(({ id, icon }) => {
    const mapping = BADGE_MAPPINGS[id];
    if (!mapping) return null;
    return {
      label: mapping.name,
      description: mapping.description || mapping.name,
      pngPath: mapping.pngPath,
      fallbackIcon: icon,
    };
  })
  .filter(Boolean) as Array<{ label: string; description: string; pngPath: string; fallbackIcon: string }>;

// Sample review texts for variety
const sampleReviewTexts = [
  "Absolutely love this place! Great atmosphere and amazing service. Will definitely come back!",
  "The best spot in town! Quality is top-notch and the staff is incredibly friendly.",
  "Hidden gem discovered! Food was incredible and the ambiance is perfect for a relaxed evening.",
  "Outstanding experience! Every detail was perfect, from service to quality. Highly recommend!",
  "Wow, just wow! Exceeded all my expectations. This is my new favorite spot in the area.",
  "Incredible find! Great value for money and the atmosphere is unbeatable. Can't wait to return!",
  "Perfect place for a date night! Romantic ambiance, delicious food, and excellent service.",
  "Top tier quality! The attention to detail here is amazing. Will be a regular customer for sure.",
  "Fantastic experience all around! Staff went above and beyond to make our visit memorable.",
  "This place never disappoints! Consistent quality and friendly service every single time.",
  "Amazing spot with great vibes! The perfect blend of quality, service, and atmosphere.",
  "Exceptional! From the moment we walked in, everything was perfect. Must visit!"
];

// Animation variants for staggered card appearance (matching badge page)
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

interface CommunityHighlightsProps {
  title?: string;
  reviews?: Review[]; // Made optional - will fetch from API if not provided
  topReviewers?: Reviewer[]; // Made optional - will fetch from API if not provided
  businessesOfTheMonth?: BusinessOfTheMonth[];
  cta?: string;
  href?: string;
  variant?: "reviews" | "reviewers";
  /** Disable scroll-triggered animations (default false). */
  disableAnimations?: boolean;
  /** Hide carousel arrows on desktop (lg+) breakpoints (default false). */
  hideCarouselArrowsOnDesktop?: boolean;
}

export default function CommunityHighlights({
  title = "Community Highlights",
  reviews: propReviews,
  topReviewers: propTopReviewers,
  businessesOfTheMonth,
  cta = "See More",
  href = "/leaderboard",
  variant = "reviews",
  disableAnimations = false,
  hideCarouselArrowsOnDesktop = false,
}: CommunityHighlightsProps) {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  // Fetch from API via SWR only when props are not provided
  const { reviewers: fetchedReviewers, mode: fetchedMode, loading: reviewersLoading } = useReviewersTop(12);
  const { reviews: fetchedReviews, loading: reviewsLoading } = useRecentReviews(10);

  const topReviewers: Reviewer[] = propTopReviewers ?? fetchedReviewers;
  const reviews: Review[] = propReviews ?? fetchedReviews;
  const reviewersMode: 'stage1' | 'normal' = fetchedMode;

  const loading = !propTopReviewers && !propReviews && (reviewersLoading || reviewsLoading);

  if (loading) {
    return <CommunityHighlightsSkeleton />;
  }

  const hasReviewers = !!topReviewers && topReviewers.length > 0;
  const hasBusinesses = Array.isArray(businessesOfTheMonth) && businessesOfTheMonth.length > 0;
  const hasCoordinateBusinesses = (Array.isArray(businessesOfTheMonth) ? businessesOfTheMonth : []).some(
    (business) =>
      typeof business.lat === "number" && Number.isFinite(business.lat) &&
      typeof business.lng === "number" && Number.isFinite(business.lng)
  );
  const isStage1 = reviewersMode !== 'normal';

  const contributorsHeadingMobile = isStage1 ? 'Early Voices' : 'Top Contributors';
  const contributorsHeadingDesktop = isStage1 ? 'Early Community Voices' : 'Top Contributors This Month';
  const contributorsEmptyTitle = 'Be among the first voices shaping Sayso.';
  const contributorsEmptyBody = 'Write your first review and help set the standard for what’s worth discovering.';

  return (
    <section
      className="relative m-0 w-full pb-8 sm:pb-10 md:pb-12"
      aria-label={title}
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >

      <div className="mx-auto w-full max-w-[2000px] relative z-10 px-2">
        {/* Header */}
        <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
          {disableAnimations ? (
            <h2
              className="font-urbanist text-2xl sm:text-3xl md:text-2xl font-bold text-charcoal hover:text-sage transition-all duration-300 px-3 sm:px-4 py-1 hover:bg-card-bg/5 rounded-lg cursor-default"
              style={{ 
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 800,
              }}
            >
              {title}
            </h2>
          ) : (
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-urbanist text-2xl sm:text-3xl md:text-2xl font-bold text-charcoal hover:text-sage transition-all duration-300 px-3 sm:px-4 py-1 hover:bg-card-bg/5 rounded-lg cursor-default"
              style={{ 
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 800,
              }}
            >
              {title}
            </motion.h2>
          )}
        </div>

        {/* Top Reviewers */}
        {hasReviewers && (
          <div className="mt-1">
            <div className="pb-1 sm:pb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-sage/20 to-sage/10 border border-sage/30">
                  <span className="text-sm font-semibold text-sage" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                    <span className="sm:hidden">{contributorsHeadingMobile}</span>
                    <span className="hidden sm:inline">{contributorsHeadingDesktop}</span>
                  </span>
                </div>
                <button
                  onClick={() => router.push('/leaderboard?tab=contributors')}
                  className="group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-colors duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative motion-reduce:transition-none"
                  aria-label="See More: Top Contributors"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}
                >
                  <span className="relative z-10 transition-[color] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] text-charcoal group-hover:text-sage after:content-[''] after:absolute after:-bottom-px after:left-0 after:h-px after:w-full after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:after:scale-x-100 motion-reduce:transition-none motion-reduce:after:transition-none" style={{ fontWeight: 400 }}>
                    See More
                  </span>
                  <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:translate-x-[3px] text-charcoal group-hover:text-sage motion-reduce:transition-none" />
                </button>
              </div>

            <ScrollableSection hideArrowsOnDesktop={hideCarouselArrowsOnDesktop}>
              <div className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-start py-2">
                {topReviewers.map((reviewer, index) => {
                // Try to find an actual review first, otherwise use sample text
                const actualReview = reviews.find(r => r.reviewer.id === reviewer.id);
                const reviewIndex = parseInt(reviewer.id) % sampleReviewTexts.length;
                const sampleText = sampleReviewTexts[reviewIndex];
                
                return (
                  <div
                    key={reviewer.id}
                    className=" snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex justify-center"
                  >
                    <ReviewerCard
                      reviewer={reviewer}
                      variant="reviewer"
                      index={index}
                      latestReview={actualReview || {
                        id: `${reviewer.id}-latest`,
                        reviewer,
                        businessName: `${reviewer.location} Favorite`,
                        businessType: "Local Business",
                        rating: reviewer.rating,
                        reviewText: sampleText,
                        date: index < 3 ? `${index + 1} days ago` : `${index + 1} weeks ago`,
                        likes: Math.floor((reviewer.reviewCount * 0.3) + 5)
                      }}
                    />
                  </div>
                );
              })}
              </div>
            </ScrollableSection>
          </div>
        )}

        {/* Top Contributors Empty State */}
        {!hasReviewers && (
          <div className="mt-1">
            <div className="pb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-sage/20 to-sage/10 border border-sage/30 mb-4">
                <span className="text-sm font-semibold text-sage" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  <span className="sm:hidden">{contributorsHeadingMobile}</span>
                  <span className="hidden sm:inline">{contributorsHeadingDesktop}</span>
                </span>
              </div>
            </div>
            
            <div className="w-full bg-off-white border border-sage/20 rounded-3xl px-6 pt-16 text-center space-y-3">
              <h2 className="text-h2 font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                {contributorsEmptyTitle}
              </h2>
              <p className="text-body-sm text-charcoal/60 max-w-[70ch] mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                {contributorsEmptyBody}
              </p>
              <div className="pt-2 flex items-center justify-center">
                <Link
                  href="/badges"
                  className="mi-tap group inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold shadow-md hover:bg-charcoal/90 transition"
                  aria-label="Learn about badges"
                >
                  <span>Explore badges</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Badge preview strip — pure CSS marquee at all breakpoints */}
                <div className="pt-5 w-[100vw] relative left-1/2 -translate-x-1/2 sm:w-auto sm:left-auto sm:translate-x-0">
                  <div className="relative badge-marquee" aria-label="Badge previews">
                    <div className="badge-track">
                      {[...badgePreviews, ...badgePreviews].map((badge, idx) => (
                        <div
                          key={`${badge.label}-${idx}`}
                          className="group relative flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-charcoal/10 px-4 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition-transform duration-200 hover:-translate-y-0.5"
                          title={badge.description}
                          tabIndex={0}
                        >
                        <span
                          className="flex items-center justify-center w-5 h-5 flex-shrink-0"
                          aria-hidden
                        >
                          {badge.pngPath ? (
                            <Image
                              src={badge.pngPath}
                              alt=""
                              width={18}
                              height={18}
                              className="object-contain"
                            />
                          ) : (
                            <span className="text-base leading-none">{badge.fallbackIcon}</span>
                          )}
                        </span>
                        <span className="text-sm font-semibold text-charcoal/80 whitespace-nowrap">
                          {badge.label}
                        </span>

                        {/* Tooltip (desktop) */}
                        <div className="hidden md:block pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 opacity-0 translate-y-1 transition-all duration-200 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-focus:opacity-100 md:group-focus:translate-y-0">
                          <div className="rounded-xl bg-charcoal text-off-white text-xs font-medium px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)] border border-white/10 whitespace-nowrap">
                            {badge.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <style dangerouslySetInnerHTML={{ __html: `
                    .badge-marquee {
                      overflow: hidden;
                      scrollbar-width: none;
                    }
                    .badge-marquee::-webkit-scrollbar { display: none; }

                    .badge-track {
                      display: flex;
                      gap: 12px;
                      width: max-content;
                      padding: 0 6px 4px 6px;
                      align-items: center;
                      animation: badge-scroll 20s linear infinite;
                      will-change: transform;
                    }

                    @media (max-width: 767px) {
                      .badge-marquee {
                        /* Safari/Chrome mobile fallback: avoid mask clipping animated content */
                        mask-image: none;
                        -webkit-mask-image: none;
                      }
                      .badge-track {
                        animation-duration: 8s;
                      }
                    }

                    /* Pause on touch (mobile) and hover (desktop) */
                    .badge-marquee:active .badge-track {
                      animation-play-state: paused;
                    }

                    @media (min-width: 768px) {
                      .badge-marquee {
                        padding: 0 8px;
                        mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
                        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
                      }
                      .badge-track {
                        animation-duration: 22s;
                      }
                      .badge-marquee:hover .badge-track {
                        animation-play-state: paused;
                      }
                    }

                    @media (prefers-reduced-motion: reduce) {
                      .badge-track { animation: none !important; }
                    }

                    @keyframes badge-scroll {
                      from { transform: translate3d(0, 0, 0); }
                      to { transform: translate3d(-50%, 0, 0); }
                    }
                  `}} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Businesses of the Month */}
        {hasBusinesses && (
          <section
            className="relative m-0 p-0 w-full mt-3 list-none"
            aria-label="Featured Businesses of the Month by Category"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
          >
            <LocationPromptBanner hasCoordinateBusinesses={hasCoordinateBusinesses} />
            <div className="mx-auto w-full max-w-[2000px] relative z-10">
              <div className="pt-12 pb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-sage/20 to-sage/10 border border-sage/30 mb-4">
                  <span className="text-sm font-semibold text-sage" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                    <span className="sm:hidden">Featured Businesses</span>
                    <span className="hidden sm:inline">Featured Businesses of the Month by Category</span>
                  </span>
                </div>
                <button
                  onClick={() => router.push('/leaderboard?tab=businesses')}
                  className="group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-colors duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative motion-reduce:transition-none"
                  aria-label="See More: Featured Businesses"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}
                >
                  <span className="relative z-10 transition-[color] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] text-charcoal group-hover:text-sage after:content-[''] after:absolute after:-bottom-px after:left-0 after:h-px after:w-full after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:after:scale-x-100 motion-reduce:transition-none motion-reduce:after:transition-none" style={{ fontWeight: 400 }}>
                    See More
                  </span>
                  <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:translate-x-[3px] text-charcoal group-hover:text-sage motion-reduce:transition-none" />
                </button>
              </div>

              <ScrollableSection enableMobilePeek hideArrowsOnDesktop={hideCarouselArrowsOnDesktop}>
                {/* Gap harmonizes with card radius/shadows; list semantics preserved via <li> inside cards */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @media (max-width: 639px) {
                    .business-month-card-full-width > li {
                      width: 100% !important;
                      max-width: 100% !important;
                    }
                  }
                `}} />
                {isDesktop ? (
                  disableAnimations ? (
                    <div className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-stretch pt-2 list-none">
                      {(Array.isArray(businessesOfTheMonth) ? businessesOfTheMonth : []).map((business, index) => (
                        <div
                          key={business.id}
                          className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex justify-center business-month-card-full-width"
                        >
                          <BusinessOfTheMonthCard
                            business={business}
                            index={index}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: "-50px" }}
                      className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-stretch pt-2 list-none"
                    >
                      {(Array.isArray(businessesOfTheMonth) ? businessesOfTheMonth : []).map((business, index) => (
                        <motion.div
                          key={business.id}
                          variants={itemVariants}
                          className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex justify-center business-month-card-full-width"
                        >
                          <BusinessOfTheMonthCard
                            business={business}
                            index={index}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )
                ) : (
                  <div className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-stretch pt-2 list-none">
                    {(Array.isArray(businessesOfTheMonth) ? businessesOfTheMonth : []).map((business, index) => (
                      <div key={business.id} className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex justify-center business-month-card-full-width">
                        <BusinessOfTheMonthCard
                          business={business}
                          index={index}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollableSection>
            </div>
          </section>
        )}

        {/* Featured Businesses Empty State */}
        {!hasBusinesses && (
          <section
            className="relative m-0 p-0 w-full mt-3 list-none"
            aria-label="Featured Businesses"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
          >
            <div className="mx-auto w-full max-w-[2000px] relative z-10">
              <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-sage/20 to-sage/10 border border-sage/30 mb-4">
                  <span className="text-sm font-semibold text-sage" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                    <span className="sm:hidden">Featured</span>
                    <span className="hidden sm:inline">Featured Businesses</span>
                  </span>
                </div>
              </div>

              <div className="w-full bg-off-white border border-sage/20 rounded-3xl px-6 py-16 text-center space-y-3">
                <h2 className="text-h2 font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Curated by trust and completeness.
                </h2>
                <p className="text-body-sm text-charcoal/60 max-w-[70ch] mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                  As the community grows, this will highlight rising businesses. For now, we’ll feature verified, well-profiled places worth exploring.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
