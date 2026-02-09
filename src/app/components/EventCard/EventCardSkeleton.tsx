"use client";

import React from "react";

/**
 * Skeleton for EventCard — structure and dimensions match EventCard exactly
 * so loading → content transition has no layout shift.
 */
export default function EventCardSkeleton() {
  return (
    <li
      className="flex w-full h-full"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <article
        className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden w-full h-full flex flex-col border border-white/60 backdrop-blur-xl shadow-md md:w-[340px] animate-pulse"
        style={{ maxWidth: "540px" } as React.CSSProperties}
      >
        {/* MEDIA — aspect-ratio 4/3, p-1, rounded-[12px] */}
        <div className="relative w-full flex-shrink-0 z-10 p-1">
          <div className="relative w-full overflow-hidden rounded-[12px] flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85" style={{ aspectRatio: '4 / 3' }}>
            <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-32 md:h-32 bg-charcoal/10 rounded-lg" />
          </div>

          {/* Badge skeleton */}
          <div className="absolute -left-1 -top-1 z-20 overflow-hidden" style={{ width: "150px", height: "120px" }}>
            <div
              className="absolute bg-navbar-bg/30 rounded-sm"
              style={{
                transform: "rotate(-50deg)",
                transformOrigin: "center",
                left: "-40px",
                top: "22px",
                width: "250px",
                height: "28px",
              }}
            />
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-4 py-4 bg-gradient-to-b from-card-bg/95 to-card-bg flex flex-col gap-2 rounded-b-[12px] flex-1">
          <div className="flex flex-col gap-2">
            <div className="h-5 sm:h-6 w-3/4 bg-charcoal/10 rounded-lg" />
            <div className="w-full flex flex-col gap-1.5">
              <div className="h-4 w-full bg-charcoal/5 rounded" />
              <div className="h-4 w-4/5 bg-charcoal/5 rounded" />
            </div>
          </div>

          <div className="mt-auto w-full h-10 px-4 py-2.5 bg-charcoal/10 rounded-full" />
        </div>
      </article>
    </li>
  );
}
