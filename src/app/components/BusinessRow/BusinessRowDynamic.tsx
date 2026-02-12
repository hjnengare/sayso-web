"use client";

import dynamic from "next/dynamic";
import { Business } from "../BusinessCard/BusinessCard";
import ScrollableSection from "../ScrollableSection/ScrollableSection";

// Minimal loading component for BusinessRow
const BusinessRowSkeleton = () => (
  <section className="pb-4 sm:pb-6 sm:pt-2 bg-off-white relative">
    <div className="container mx-auto max-w-[2000px] px-2 relative z-10">
      <div className="mb-6 sm:mb-12 flex items-center justify-between gap-3">
        <div className="h-6 bg-sage/10 rounded w-32" />
        <div className="h-4 bg-sage/10 rounded w-20" />
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
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] lg:min-w-[20%] xl:min-w-[18%] 2xl:min-w-[16%] list-none flex business-card-skeleton-full-width">
              <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-visible w-full sm:w-[260px] md:w-[340px] h-[650px] sm:h-auto md:h-[416px] flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md animate-pulse">
                {/* Image Section Skeleton */}
                <div className="relative overflow-hidden z-10 rounded-t-[12px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 border-b border-white/60 backdrop-blur-xl h-[490px] sm:h-[320px] md:h-[240px]" />
                {/* Content Section Skeleton */}
                <div className="px-4 sm:px-5 pt-2 pb-2 flex-1 relative flex-shrink-0 flex flex-col justify-between bg-sage/10 z-10 rounded-b-[12px]">
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

// Dynamic import with better loading state
const BusinessRowDynamic = dynamic(
  () => import("./BusinessRow"),
  {
    ssr: false, // Disable SSR for better performance with animations
    loading: () => <BusinessRowSkeleton />,
  }
);

// Props interface
interface BusinessRowDynamicProps {
  title: string;
  businesses?: Business[];
  loading?: boolean;
  error?: string | null;
  cta?: string;
  href?: string;
}

// Wrapper component with error boundary
export default function BusinessRowDynamicWrapper(props: BusinessRowDynamicProps) {
  return <BusinessRowDynamic {...props} businesses={props.businesses || []} />;
}
