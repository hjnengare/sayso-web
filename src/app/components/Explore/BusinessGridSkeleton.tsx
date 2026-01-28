"use client";

export default function BusinessGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="list-none">
          <div
            className="px-1 pt-1 pb-0 rounded-[20px] relative flex-shrink-0 flex flex-col justify-between bg-sage z-10 shadow-md w-full h-[650px] sm:h-auto animate-pulse"
          >
            {/* Image Section Skeleton - matches BusinessCard media height */}
            <div className="relative overflow-hidden z-10 rounded-t-[20px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 h-[490px] sm:h-[320px] md:h-[240px]">
              {/* Centered icon placeholder */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85">
                <div className="w-32 h-32 md:w-36 md:h-36 bg-charcoal/10 rounded-lg" />
              </div>

              {/* Verified badge skeleton - top left */}
              <div className="absolute left-4 top-4 z-20">
                <div className="h-6 w-6 bg-sage/30 rounded-full" />
              </div>

              {/* Rating badge skeleton - top right */}
              <div className="absolute right-4 top-4 z-20">
                <div className="h-7 w-14 bg-off-white/80 rounded-full" />
              </div>

              {/* Info button skeleton (mobile) */}
              <div className="md:hidden absolute left-4 bottom-4 z-20 h-10 w-10 rounded-full bg-navbar-bg/30" />
            </div>

            {/* Content Section Skeleton - matches BusinessCard content */}
            <div className="px-4 sm:px-5 pt-1 md:pt-2 lg:pt-3 pb-0 relative flex-shrink-0 flex flex-col md:justify-start justify-between bg-sage/10 z-10 rounded-b-[20px]">
              <div className="flex flex-col items-center text-center space-y-2">
                {/* Business Name skeleton */}
                <div className="flex items-center justify-center w-full h-[2rem] sm:h-[2.5rem]">
                  <div className="h-6 sm:h-7 w-3/4 bg-charcoal/10 rounded-lg" />
                </div>

                {/* Category with icon skeleton */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5">
                    <div className="w-8 h-8 rounded-full bg-off-white/20" />
                    <div className="h-4 w-20 bg-charcoal/10 rounded" />
                  </div>

                  {/* Description skeleton */}
                  <div className="flex flex-col items-center gap-1 w-full px-1">
                    <div className="h-3 w-full bg-charcoal/5 rounded" />
                    <div className="h-3 w-2/3 bg-charcoal/5 rounded" />
                  </div>
                </div>

                {/* Reviews skeleton */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="inline-flex items-center justify-center gap-1 min-h-[20px]">
                    <div className="h-4 w-16 bg-charcoal/10 rounded" />
                  </div>
                </div>

                {/* Percentile chips skeleton - 4 chips */}
                <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-3 flex-nowrap min-h-[28px] sm:min-h-[28px] py-1 md:bg-off-white/50 md:backdrop-blur-sm md:rounded-[20px] overflow-hidden w-[90%] mx-auto md:mb-2 shadow-sm">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-4 h-4 bg-off-white/20 rounded" />
                    <div className="h-3 w-6 bg-off-white/20 rounded hidden sm:block" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-4 h-4 bg-off-white/20 rounded" />
                    <div className="h-3 w-6 bg-off-white/20 rounded hidden sm:block" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-4 h-4 bg-off-white/20 rounded" />
                    <div className="h-3 w-6 bg-off-white/20 rounded hidden sm:block" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-4 h-4 bg-off-white/20 rounded" />
                    <div className="h-3 w-6 bg-off-white/20 rounded hidden sm:block" />
                  </div>
                </div>
              </div>

              {/* Mobile Review button skeleton */}
              <div className="flex md:hidden items-center justify-center pt-2 pb-2">
                <div className="flex-1 h-12 bg-charcoal/10 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
