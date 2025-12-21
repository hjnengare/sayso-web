import ScrollableSection from "../ScrollableSection/ScrollableSection";

interface BusinessRowSkeletonProps {
  title: string;
  cards?: number;
}

const DEFAULT_CARD_COUNT = 4;

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
          <div className="h-7 w-32 rounded-lg bg-charcoal/5" />
          <div className="h-8 w-24 rounded-full bg-charcoal/5" />
        </div>

        <ScrollableSection>
          <style dangerouslySetInnerHTML={{ __html: `
            @media (max-width: 639px) {
              .business-card-skeleton-full-width > div {
                width: 100% !important;
                max-width: 100% !important;
              }
            }
          `}} />
          <div className="flex gap-3 items-stretch pt-2">
            {Array.from({ length: cards }).map((_, index) => (
              <div key={index} className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] xl:min-w-[25%] list-none flex business-card-skeleton-full-width">
                <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-visible w-full sm:w-[260px] md:w-[340px] h-[650px] sm:h-auto md:h-[416px] flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md animate-pulse">
                  {/* Image Section Skeleton */}
                  <div className="relative overflow-hidden z-10 rounded-t-[20px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 border-b border-white/60 backdrop-blur-xl h-[490px] sm:h-[320px] md:h-[240px]" />
                  {/* Content Section Skeleton */}
                  <div className="px-4 sm:px-5 pt-2 pb-2 flex-1 relative flex-shrink-0 flex flex-col justify-between bg-sage/10 z-10 rounded-b-[20px]">
                    <div className="flex-1 flex flex-col items-center text-center space-y-1">
                      <div className="h-6 w-3/4 bg-charcoal/10 rounded-lg" />
                      <div className="h-4 w-1/2 bg-charcoal/5 rounded" />
                      <div className="h-4 w-2/3 bg-charcoal/5 rounded" />
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

