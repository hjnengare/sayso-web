"use client";

import React from "react";

/**
 * Skeleton for ReviewerCard (variant="reviewer").
 * Structure matches the redesigned card exactly to prevent layout shift.
 */
export default function ReviewerCardSkeleton() {
  return (
    <div
      className="snap-start snap-always w-full sm:w-[240px] flex-shrink-0"
      aria-hidden
    >
      <div className="relative bg-card-bg rounded-2xl overflow-hidden shadow-md">
        {/* Top accent */}
        <div className="h-[3px] w-full bg-gradient-to-r from-coral/20 via-sage/20 to-coral/10" />

        <div className="p-4 flex flex-col gap-3.5">

          {/* Identity row */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-charcoal/8 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-4 w-28 bg-charcoal/8 rounded-md animate-pulse" />
              <div className="h-3 w-16 bg-charcoal/5 rounded-md animate-pulse" />
            </div>
          </div>

          {/* Review count */}
          <div className="flex justify-center">
            <div className="flex flex-col items-center px-6 py-2.5 rounded-xl bg-off-white/60 border border-charcoal/[0.06] gap-1">
              <div className="h-7 w-10 bg-charcoal/8 rounded-md animate-pulse" />
              <div className="h-2.5 w-12 bg-charcoal/5 rounded-md animate-pulse" />
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1">
            <div className="h-5 w-16 bg-charcoal/8 rounded-full animate-pulse" />
            <div className="h-5 w-14 bg-charcoal/8 rounded-full animate-pulse" />
            <div className="h-5 w-12 bg-charcoal/8 rounded-full animate-pulse" />
          </div>

          {/* Latest review snippet */}
          <div className="rounded-xl px-3 py-2.5 bg-off-white/50 border border-charcoal/[0.06] space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-[2px]">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-sm bg-coral/20 animate-pulse" />
                ))}
              </div>
              <div className="h-2 w-8 bg-charcoal/5 rounded animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-charcoal/5 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-charcoal/5 rounded animate-pulse" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
