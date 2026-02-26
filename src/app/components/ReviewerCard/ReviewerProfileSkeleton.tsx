"use client";

import React from "react";

/**
 * Comprehensive skeleton loader for reviewer profile page
 * Matches the actual page structure with proper spacing and dimensions
 */
export default function ReviewerProfileSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-off-white">
      <main className="relative font-urbanist" role="main" aria-label="Loading reviewer profile">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:px-12 relative z-10">
          {/* Breadcrumb Skeleton */}
          <nav className="py-1" aria-label="Breadcrumb skeleton">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <div className="h-4 w-12 bg-charcoal/10 rounded animate-pulse" />
              </li>
              <li className="flex items-center">
                <div className="w-4 h-4 bg-charcoal/10 rounded animate-pulse" />
              </li>
              <li>
                <div className="h-4 w-24 bg-charcoal/10 rounded animate-pulse" />
              </li>
            </ol>
          </nav>

          <div className="pt-4 pb-16 sm:pb-20 md:pb-24">
            <div className="space-y-8">
              {/* Profile Header Skeleton */}
              <article className="w-full sm:mx-0" aria-hidden="true">
                <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/80 rounded-[20px] shadow-2xl relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-sage/15 via-coral/10 to-transparent rounded-full blur-xl opacity-30"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-coral/15 via-sage/10 to-transparent rounded-full blur-lg opacity-30"></div>
                  
                  <div className="relative z-10 p-8 sm:p-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                      {/* Profile Picture Skeleton */}
                      <div className="relative flex-shrink-0">
                        <div className="w-28 h-28 sm:w-36 sm:h-36 bg-charcoal/10 rounded-full border-4 border-white shadow-2xl ring-4 ring-white/60 animate-pulse" />
                      </div>

                      {/* Profile Info Skeleton */}
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className="h-10 w-48 bg-charcoal/10 rounded animate-pulse" />
                          <div className="h-6 w-20 bg-sage/10 rounded-full animate-pulse" />
                        </div>
                        <div className="flex items-center gap-4 mb-4 flex-wrap">
                          <div className="h-4 w-32 bg-charcoal/5 rounded animate-pulse" />
                          <div className="h-4 w-36 bg-charcoal/5 rounded animate-pulse" />
                        </div>
                        <div className="flex items-center gap-6 mb-4 flex-wrap">
                          <div className="h-6 w-16 bg-coral/10 rounded animate-pulse" />
                          <div className="h-4 w-24 bg-charcoal/5 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              {/* Stats Grid Skeleton */}
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-6" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl   rounded-[16px] shadow-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-coral/20 rounded animate-pulse" />
                      <div className="h-3 w-12 bg-charcoal/5 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-16 bg-charcoal/10 rounded animate-pulse" />
                  </div>
                ))}
              </section>

              {/* Badges Section Skeleton */}
              <section className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl   rounded-[20px] shadow-2xl p-8 sm:p-10" aria-hidden="true">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-6 w-48 bg-charcoal/10 rounded animate-pulse" />
                  <div className="h-5 w-8 bg-charcoal/5 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="bg-gradient-to-br from-white/60 to-off-white/80 rounded-[16px] p-6 border-none shadow-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-charcoal/10 rounded-full animate-pulse" />
                        <div>
                          <div className="h-4 w-20 bg-charcoal/10 rounded animate-pulse mb-1" />
                          <div className="h-3 w-16 bg-charcoal/5 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-3 w-full bg-charcoal/5 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </section>

              {/* Reviews Section Skeleton */}
              <section className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl   rounded-[20px] shadow-2xl p-8 sm:p-10" aria-hidden="true">
                <div className="h-6 w-32 bg-charcoal/10 rounded animate-pulse mb-6" />
                <div className="space-y-6">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="bg-gradient-to-br from-white/60 to-off-white/80 rounded-[16px] p-6 border-none shadow-lg">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 bg-charcoal/10 rounded-xl animate-pulse flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="h-5 w-32 bg-charcoal/10 rounded animate-pulse" />
                            <div className="flex gap-1">
                              {Array.from({ length: 5 }).map((_, starIndex) => (
                                <div key={starIndex} className="w-4 h-4 bg-coral/20 rounded-sm animate-pulse" />
                              ))}
                            </div>
                          </div>
                          <div className="h-4 w-24 bg-charcoal/5 rounded animate-pulse mb-2" />
                          <div className="space-y-2">
                            <div className="h-3 w-full bg-charcoal/5 rounded animate-pulse" />
                            <div className="h-3 w-full bg-charcoal/5 rounded animate-pulse" />
                            <div className="h-3 w-3/4 bg-charcoal/5 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-20 bg-charcoal/5 rounded animate-pulse" />
                        <div className="flex gap-2">
                          <div className="h-6 w-12 bg-sage/10 rounded animate-pulse" />
                          <div className="h-6 w-12 bg-charcoal/5 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}