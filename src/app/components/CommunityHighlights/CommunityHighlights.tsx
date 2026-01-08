// src/components/CommunityHighlights/CommunityHighlights.tsx
"use client";

import { useRouter } from "next/navigation";
import { Award, ArrowRight } from "react-feather";
import { Fontdiner_Swanky } from "next/font/google";
import ReviewerCard from "../ReviewerCard/ReviewerCard";
import BusinessOfTheMonthCard from "../BusinessCard/BusinessOfTheMonthCard";
import ScrollableSection from "../ScrollableSection/ScrollableSection";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";
import {
  Review,
  Reviewer,
  BusinessOfTheMonth,
} from "../../data/communityHighlightsData";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

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

interface CommunityHighlightsProps {
  title?: string;
  reviews: Review[];
  topReviewers: Reviewer[];
  businessesOfTheMonth?: BusinessOfTheMonth[];
  cta?: string;
  href?: string;
  variant?: "reviews" | "reviewers";
}

export default function CommunityHighlights({
  title = "Community Highlights",
  reviews,
  topReviewers,
  businessesOfTheMonth,
  cta = "See More",
  href = "/leaderboard",
  variant = "reviews",
}: CommunityHighlightsProps) {
  const router = useRouter();

  if (
    (!topReviewers || topReviewers.length === 0) &&
    (!businessesOfTheMonth || businessesOfTheMonth.length === 0)
  ) {
    return null;
  }

  return (
    <section
      className="relative m-0 w-full"
      aria-label={title}
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >

      <div className="mx-auto w-full max-w-[2000px] relative z-10 px-2">
        {/* Header */}
        <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
          <WavyTypedTitle
            text={title}
            as="h2"
            className={`${swanky.className} text-h2 sm:text-h1 font-bold text-charcoal hover:text-sage transition-all duration-300 px-3 sm:px-4 py-1 hover:bg-sage/5 rounded-lg cursor-default`}
            typingSpeedMs={40}
            startDelayMs={300}
            waveVariant="subtle"
            loopWave={true}
            enableScrollTrigger={true}
            disableWave={true}
            style={{ 
              fontFamily: swanky.style.fontFamily,
            }}
          />
        </div>

        {/* Top Reviewers */}
        {topReviewers && topReviewers.length > 0 && (
          <div className="mt-1">
            <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
                <h3
                  className={`${swanky.className} text-base font-bold text-charcoal transition-all duration-300 px-3 sm:px-4 py-1 rounded-lg cursor-none`}
                  style={{ fontFamily: swanky.style.fontFamily }}
                >
                  <span className="sm:hidden">Top Contributors</span>
                  <span className="hidden sm:inline">Top Contributors This Month</span>
                </h3>
                <button
                  onClick={() => router.push('/leaderboard?tab=contributors')}
                  className="group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-all duration-300 hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative"
                  aria-label="See More: Top Contributors"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                >
                  <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-0.5 text-charcoal group-hover:text-sage" style={{ fontWeight: 600 }}>
                    See More
                  </span>
                  <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 text-charcoal group-hover:text-sage" />
                </button>
              </div>

            <ScrollableSection>
              <div className="flex gap-3 items-stretch py-2">
                {topReviewers.map((reviewer, index) => {
                // Try to find an actual review first, otherwise use sample text
                const actualReview = reviews.find(r => r.reviewer.id === reviewer.id);
                const reviewIndex = parseInt(reviewer.id) % sampleReviewTexts.length;
                const sampleText = sampleReviewTexts[reviewIndex];
                
                return (
                  <div
                    key={reviewer.id}
                    className="snap-start snap-always flex-shrink-0 w-[calc(66.666vw-0.75rem)] sm:w-auto list-none flex"
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

        {/* Businesses of the Month */}
        {businessesOfTheMonth && businessesOfTheMonth.length > 0 && (
          <section
            className="relative m-0 p-0 w-full mt-3 list-none"
            aria-label="Featured Businesses of the Month by Category"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
          >
            <div className="mx-auto w-full max-w-[2000px] relative z-10">
              <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
                <h3
                  className={`${swanky.className} text-base font-bold text-charcoal transition-all duration-300 px-3 sm:px-4 py-1 rounded-lg cursor-default`}
                  style={{ fontFamily: swanky.style.fontFamily }}
                >
                  <span className="sm:hidden">Featured Businesses</span>
                  <span className="hidden sm:inline">Featured Businesses of the Month by Category</span>
                </h3>
                <button
                  onClick={() => router.push('/leaderboard?tab=businesses')}
                  className="group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-all duration-300 hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative"
                  aria-label="See More: Featured Businesses"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                >
                  <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-0.5 text-charcoal group-hover:text-sage" style={{ fontWeight: 600 }}>
                    See More
                  </span>
                  <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 text-charcoal group-hover:text-sage" />
                </button>
              </div>

              <ScrollableSection>
                {/* Gap harmonizes with card radius/shadows; list semantics preserved via <li> inside cards */}
                <div className="flex gap-3 items-stretch pt-2 list-none">
                  {businessesOfTheMonth.map((business, index) => (
                    <BusinessOfTheMonthCard
                      key={business.id}
                      business={business}
                      index={index}
                    />
                  ))}
                </div>
              </ScrollableSection>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
