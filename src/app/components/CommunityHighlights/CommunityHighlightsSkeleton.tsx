"use client";

import ScrollableSection from "../ScrollableSection/ScrollableSection";
import ReviewerCardSkeleton from "../ReviewerCard/ReviewerCardSkeleton";

interface CommunityHighlightsSkeletonProps {
  reviewerCount?: number;
  businessCount?: number;
}

/**
 * Skeleton for CommunityHighlights — structure matches the real section exactly:
 * main header, Top Contributors sub-header + row (same wrapper/card layout, spread end to end), Featured Businesses.
 */
export default function CommunityHighlightsSkeleton({
  reviewerCount = 12,
  businessCount = 4,
}: CommunityHighlightsSkeletonProps) {
  return (
    <section
      className="relative m-0 w-full"
      aria-label="Community Highlights loading"
      aria-busy="true"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto w-full max-w-[2000px] relative z-10 px-2">
        {/* Main header — same as CommunityHighlights */}
        <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
          <div className="h-8 sm:h-10 w-48 sm:w-64 bg-charcoal/10 rounded-lg animate-pulse px-3 sm:px-4 py-1" />
        </div>

        {/* Top Contributors — exact structure as CommunityHighlights: sub-header + row, same wrappers so skeleton spreads end to end */}
        <div className="mt-1">
          <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
            <div className="h-5 w-56 sm:w-64 bg-charcoal/10 rounded-lg animate-pulse px-3 sm:px-4 py-1" />
            <div className="inline-flex items-center gap-1 px-4 py-2 -mx-2">
              <div className="h-4 w-16 bg-charcoal/10 rounded-full animate-pulse" />
              <div className="h-4 w-4 bg-charcoal/10 rounded-full animate-pulse" />
            </div>
          </div>

          <ScrollableSection>
            <div className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-stretch py-2 mb-20">
              {Array.from({ length: reviewerCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex justify-center"
                >
                  <ReviewerCardSkeleton />
                </div>
              ))}
            </div>
          </ScrollableSection>
        </div>

        {/* Featured Businesses of the Month — sub-header + row, same structure as real */}
        <section className="relative m-0 p-0 w-full mt-3 list-none" aria-hidden>
          <div className="mx-auto w-full max-w-[2000px] relative z-10">
            <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
              <div className="h-5 w-48 sm:w-72 bg-charcoal/10 rounded-lg animate-pulse px-3 sm:px-4 py-1" />
              <div className="inline-flex items-center gap-1 px-4 py-2 -mx-2">
                <div className="h-4 w-16 bg-charcoal/10 rounded-full animate-pulse" />
                <div className="h-4 w-4 bg-charcoal/10 rounded-full animate-pulse" />
              </div>
            </div>

            <ScrollableSection enableMobilePeek>
              <style dangerouslySetInnerHTML={{ __html: `
                @media (max-width: 639px) {
                  .business-month-card-full-width > li {
                    width: 100% !important;
                    max-width: 100% !important;
                  }
                }
              `}} />
              <div className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-stretch pt-2 list-none">
                {Array.from({ length: businessCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex justify-center business-month-card-full-width"
                  >
                    <BusinessOfTheMonthCardSkeleton />
                  </div>
                ))}
              </div>
            </ScrollableSection>
          </div>
        </section>
      </div>
    </section>
  );
}

/**
 * Skeleton for BusinessOfTheMonthCard — structure and dimensions match the real card.
 */
function BusinessOfTheMonthCardSkeleton() {
  return (
    <li
      className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:w-[260px] md:w-[340px] list-none"
      style={{
        fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <div
        className="relative px-1 pt-1 pb-2 sm:pb-0 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-visible w-full flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md sm:h-auto animate-pulse"
        style={{ maxWidth: "540px" } as React.CSSProperties}
      >
        {/* MEDIA — same as BusinessOfTheMonthCard */}
        <div className="relative overflow-hidden z-10 rounded-t-[12px] h-[280px] sm:h-[220px] md:h-[240px]">
          <div className="absolute inset-0 bg-gradient-to-br from-off-white/90 via-off-white/80 to-off-white/70" />
        </div>

        {/* CONTENT — same padding and layout as BusinessOfTheMonthCard */}
        <div className="px-4 py-3 sm:px-5 sm:pt-1 md:pt-2 lg:pt-3 pb-0 flex-1 relative flex-shrink-0 flex flex-col justify-between bg-sage/10 z-10 rounded-b-[12px]">
          <div className="flex-1 flex flex-col items-center text-center space-y-1">
            <div className="h-6 sm:h-7 w-3/4 bg-charcoal/10 rounded-lg mx-auto" />
            <div className="h-4 w-1/2 bg-charcoal/5 rounded mx-auto" />
            <div className="h-4 w-2/3 bg-charcoal/5 rounded mx-auto mt-2" />
            <div className="h-4 w-20 bg-charcoal/5 rounded mx-auto mt-2" />
          </div>
          {/* Mobile actions bar */}
          <div className="flex md:hidden items-center justify-center pt-4 border-t border-off-white/30">
            <div className="h-12 w-24 bg-charcoal/10 rounded-full" />
          </div>
        </div>
      </div>
    </li>
  );
}
