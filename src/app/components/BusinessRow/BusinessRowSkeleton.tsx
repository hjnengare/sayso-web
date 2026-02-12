import ScrollableSection from "../ScrollableSection/ScrollableSection";

interface BusinessRowSkeletonProps {
  title: string;
  cards?: number;
}

const DEFAULT_CARD_COUNT = 5;

export default function BusinessRowSkeleton({ title, cards = DEFAULT_CARD_COUNT }: BusinessRowSkeletonProps) {
  return (
    <section
      className="relative m-0 p-0 w-full"
      aria-label={`${title} loading`}
      aria-busy="true"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <div className="mx-auto w-full max-w-[2000px] relative z-10 px-2">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="h-7 w-32 rounded-lg bg-charcoal/5 animate-pulse" />
          <div className="h-8 w-24 rounded-full bg-charcoal/5 animate-pulse" />
        </div>

        <ScrollableSection enableMobilePeek>
          <style dangerouslySetInnerHTML={{ __html: `
            @media (max-width: 639px) {
              .business-card-skeleton-full-width > div {
                width: 100% !important;
                max-width: 100% !important;
              }
            }
          `}} />
          <div className="flex gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2 items-stretch pt-2">
            {Array.from({ length: cards }).map((_, index) => (
              <div key={index} className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex business-card-skeleton-full-width">
                <div className="px-1 pt-1 pb-0 rounded-[12px] relative flex-shrink-0 flex flex-col justify-between bg-sage z-10 shadow-md w-full sm:w-[260px] md:w-[340px] h-[650px] sm:h-auto">
                  {/* Image Section Skeleton - matches BusinessCard media heights */}
                  <div className="relative overflow-hidden z-10 rounded-t-[12px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl h-[490px] sm:h-[320px] md:h-[240px] animate-pulse">
                    {/* Verified badge skeleton */}
                    <div className="absolute left-4 top-4 z-20 h-6 w-6 rounded-full bg-sage/30" />
                    {/* Rating badge skeleton */}
                    <div className="absolute right-4 top-4 z-20 h-8 w-16 rounded-full bg-off-white/40" />
                    {/* Info button skeleton (mobile) */}
                    <div className="md:hidden absolute left-4 bottom-4 z-20 h-10 w-10 rounded-full bg-navbar-bg/30" />
                  </div>

                  {/* Content Section Skeleton - matches BusinessCard content area */}
                  <div className="px-4 sm:px-5 pt-1 md:pt-2 lg:pt-3 pb-0 flex-1 relative flex-shrink-0 flex flex-col md:justify-start justify-between bg-sage/10 z-10 rounded-b-[12px]">
                    <div className="flex flex-col items-center text-center space-y-1">
                      {/* Business Name skeleton */}
                      <div className="h-[2rem] sm:h-[2.5rem] w-full flex items-center justify-center">
                        <div className="h-6 sm:h-7 w-3/4 bg-charcoal/10 rounded-lg animate-pulse" />
                      </div>

                      {/* Category with icon skeleton */}
                      <div className="flex flex-col items-center gap-1.5 w-full">
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5">
                          <div className="w-8 h-8 rounded-full bg-off-white/20 animate-pulse" />
                          <div className="h-4 w-20 bg-charcoal/5 rounded animate-pulse" />
                        </div>
                        {/* Description skeleton */}
                        <div className="h-3 w-2/3 bg-charcoal/5 rounded animate-pulse" />
                      </div>

                      {/* Reviews skeleton */}
                      <div className="flex flex-col items-center gap-2 mb-2">
                        <div className="inline-flex items-center justify-center gap-1 min-h-[12px]">
                          <div className="h-4 w-6 bg-charcoal/10 rounded animate-pulse" />
                          <div className="h-4 w-16 bg-charcoal/5 rounded animate-pulse" />
                        </div>
                      </div>

                      {/* Percentile chips skeleton - 4 chips */}
                      <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-3 flex-nowrap min-h-[28px] py-1 md:bg-off-white/50 md:backdrop-blur-sm md:rounded-[12px] overflow-hidden w-[90%] mx-auto md:mb-2 shadow-sm">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-6 w-12 bg-off-white/20 rounded-full animate-pulse" />
                        ))}
                      </div>
                    </div>

                    {/* Mobile review button skeleton */}
                    <div className="flex md:hidden items-center justify-center pt-2 pb-2">
                      <div className="flex-1 h-12 bg-navbar-bg/30 rounded-full animate-pulse" />
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

