"use client";

import dynamic from "next/dynamic";
import { Business } from "../BusinessCard/BusinessCard";

// Minimal loading component for BusinessRow
const BusinessRowSkeleton = () => (
  <section className="pb-4 sm:pb-6 sm:pt-2  bg-off-white   relative">
    <div className="container mx-auto max-w-[1300px] px-4 relative z-10">
      <div className="mb-6 sm:mb-12 flex items-center justify-between gap-3">
        <div className="h-6 bg-sage/10 rounded w-32" />
        <div className="h-4 bg-sage/10 rounded w-20" />
      </div>
      <div className="flex gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0">
            <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-visible w-[280px] h-[650px] sm:h-auto md:w-[340px] md:h-[416px] flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md animate-pulse">
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
