"use client";

import ScrollableSection from "../ScrollableSection/ScrollableSection";

interface FeaturedBusinessesSkeletonProps {
  count?: number;
}

export default function FeaturedBusinessesSkeleton({ count = 4 }: FeaturedBusinessesSkeletonProps) {
  return (
    <section
      className="relative m-0 p-0 w-full mt-3 list-none"
      aria-label="Featured Businesses loading"
      aria-busy="true"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <div className="mx-auto w-full max-w-[2000px] relative z-10">
        {/* Header Skeleton */}
        <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
          <div className="h-6 w-48 bg-charcoal/10 rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-charcoal/10 rounded-full animate-pulse" />
        </div>

        <ScrollableSection enableMobilePeek>
          <div className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-stretch pt-2 list-none">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="list-none flex">
                <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-visible w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] h-[650px] sm:h-auto md:w-[340px] md:h-[416px] flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md animate-pulse">
                  {/* Image Section Skeleton */}
                  <div className="relative overflow-hidden z-10 rounded-t-[12px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 border-b border-white/60 backdrop-blur-xl h-[490px] sm:h-[320px] md:h-[240px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-off-white/90 via-off-white/80 to-off-white/70" />
                  </div>

                  {/* Content Section Skeleton */}
                  <div className="px-4 sm:px-5 pt-2 pb-2 flex-1 relative flex-shrink-0 flex flex-col justify-between bg-sage/10 z-10 rounded-b-[12px]">
                    <div className="flex-1 flex flex-col items-center text-center space-y-1">
                      {/* Business Name Skeleton */}
                      <div className="h-6 w-3/4 bg-charcoal/10 rounded-lg mx-auto" />
                      
                      {/* Category and Location Skeleton */}
                      <div className="h-4 w-1/2 bg-charcoal/5 rounded mx-auto" />
                      
                      {/* Reviews Skeleton */}
                      <div className="h-4 w-2/3 bg-charcoal/5 rounded mx-auto mt-2" />
                      
                      {/* Stars Skeleton */}
                      <div className="h-4 w-20 bg-charcoal/5 rounded mx-auto mt-2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollableSection>
      </div>
    </section>
  );
}

