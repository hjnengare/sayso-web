"use client";

import ScrollableSection from "../ScrollableSection/ScrollableSection";

interface CommunityHighlightsSkeletonProps {
  reviewerCount?: number;
  businessCount?: number;
}

export default function CommunityHighlightsSkeleton({ reviewerCount = 4, businessCount = 4 }: CommunityHighlightsSkeletonProps) {
  return (
    <section className="relative m-0 w-full" aria-label="Community Highlights loading" aria-busy="true">
      <div className="mx-auto w-full max-w-[2000px] relative z-10 px-2 py-8">
        {/* Header Skeleton */}
        <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
          <div className="h-6 w-48 bg-charcoal/10 rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-charcoal/10 rounded-full animate-pulse" />
        </div>

        {/* Top Reviewers Skeleton */}
        <ScrollableSection>
          <div className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-stretch py-2">
            {Array.from({ length: reviewerCount }).map((_, idx) => (
              <div key={idx} className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex justify-center">
                <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl rounded-[20px] overflow-visible group h-[240px] w-full sm:w-[240px] border border-white/60 ring-1 ring-white/30 shadow-md animate-pulse flex flex-col p-2">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-8 h-8 bg-charcoal/10 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-20 bg-charcoal/10 rounded mb-1" />
                      <div className="h-3 w-16 bg-charcoal/5 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-16 bg-charcoal/10 rounded mb-1" />
                  <div className="h-3 w-12 bg-charcoal/5 rounded mb-2" />
                  <div className="h-4 w-32 bg-charcoal/10 rounded mb-2" />
                  <div className="flex-1" />
                  <div className="flex gap-1.5 mt-auto">
                    <div className="w-8 h-8 bg-charcoal/10 rounded-full" />
                    <div className="w-8 h-8 bg-charcoal/10 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollableSection>

        {/* Featured Businesses Skeleton */}
        <div className="mt-3">
          <ScrollableSection>
            <div className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-stretch pt-2 list-none">
              {Array.from({ length: businessCount }).map((_, idx) => (
                <div key={idx} className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex justify-center">
                  <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-visible w-full sm:w-[260px] md:w-[340px] h-[650px] sm:h-auto md:h-[416px] flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md animate-pulse">
                    <div className="relative overflow-hidden z-10 rounded-t-[20px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 border-b border-white/60 backdrop-blur-xl h-[280px] sm:h-[220px] md:h-[240px]">
                      <div className="absolute inset-0 bg-gradient-to-br from-off-white/90 via-off-white/80 to-off-white/70" />
                    </div>
                    <div className="px-4 sm:px-5 pt-2 pb-2 flex-1 relative flex-shrink-0 flex flex-col justify-between bg-sage/10 z-10 rounded-b-[20px]">
                      <div className="flex-1 flex flex-col items-center text-center space-y-1">
                        <div className="h-6 w-3/4 bg-charcoal/10 rounded-lg mx-auto" />
                        <div className="h-4 w-1/2 bg-charcoal/5 rounded mx-auto" />
                        <div className="h-4 w-2/3 bg-charcoal/5 rounded mx-auto mt-2" />
                        <div className="h-4 w-20 bg-charcoal/5 rounded mx-auto mt-2" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollableSection>
        </div>
      </div>
    </section>
  );
}
