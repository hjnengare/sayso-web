"use client";

import React from "react";

export default function EventCardSkeleton() {
  return (
    <li
      className="flex w-full"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <article
        className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-visible h-[600px] sm:h-auto flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-premiumElevated animate-pulse"
        style={
          {
            width: "100%",
            maxWidth: "540px",
          } as React.CSSProperties
        }
      >
        {/* MEDIA - Full bleed with skeleton */}
        <div className="relative overflow-hidden flex-1 sm:flex-initial h-[360px] sm:h-[320px] lg:h-[240px] xl:h-[220px] z-10 rounded-t-[12px] border-b border-white/60">
          <div className="absolute inset-0 bg-gradient-to-b from-off-white/90 via-off-white/80 to-off-white/70" />
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-32 md:h-32 bg-charcoal/10 rounded-lg" />
          </div>
        </div>

        {/* CONTENT - Skeleton content */}
        <div className="px-4 pt-4 pb-6 flex flex-col justify-between bg-gradient-to-br from-sage/12 via-sage/8 to-sage/10 gap-4 rounded-b-[12px] border-t border-white/30">
          <div className="flex flex-col items-center text-center gap-3">
            {/* Title skeleton */}
            <div className="h-6 w-3/4 bg-charcoal/10 rounded-lg" />
            <div className="h-5 w-1/2 bg-charcoal/10 rounded-lg" />
            
            {/* Description skeleton */}
            <div className="h-4 w-full bg-charcoal/5 rounded mt-2" />
            <div className="h-4 w-2/3 bg-charcoal/5 rounded" />
          </div>

          {/* Button skeleton */}
          <div className="w-full min-h-[44px] py-3 px-4 bg-charcoal/10 rounded-full" />
        </div>
      </article>
    </li>
  );
}

