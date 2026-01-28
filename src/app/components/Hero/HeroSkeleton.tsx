// src/components/Hero/HeroSkeleton.tsx
"use client";

export default function HeroSkeleton() {
  return (
    <>
      {/* Active Filter Badges Skeleton */}
      <div className="relative w-full px-4">
        <div className="h-8 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-full w-24 animate-pulse" />
      </div>

      {/* Hero Section Skeleton */}
      <div className="relative w-full px-0 sm:px-2 lg:px-0 py-2 md:px-2 pt-[70px] md:pt-[72px] lg:pt-[72px]">
        <div className="relative h-[100vh] sm:h-[70vh] md:h-[100vh] lg:h-[100vh] w-full overflow-hidden outline-none rounded-none sm:rounded-[12px] md:rounded-none lg:rounded-none min-h-[400px] shadow-md">
          {/* Background shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-none sm:rounded-[12px] md:rounded-none lg:rounded-none animate-pulse" />
          
          {/* Liquid Glass Ambient Lighting */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sage/10 pointer-events-none rounded-none sm:rounded-[12px] md:rounded-none lg:rounded-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none rounded-none sm:rounded-[12px] md:rounded-none lg:rounded-none" />
          <div className="absolute inset-0 backdrop-blur-[1px] bg-off-white/5 mix-blend-overlay pointer-events-none rounded-none sm:rounded-[12px] md:rounded-none lg:rounded-none" />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent rounded-none sm:rounded-[12px] md:rounded-none lg:rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 rounded-none sm:rounded-[12px] md:rounded-none lg:rounded-none" />
          <div className="absolute inset-0 bg-black/20 rounded-none sm:rounded-[12px] md:rounded-none lg:rounded-none" />

          {/* Centered content skeleton */}
          <div className="absolute inset-0 z-20 flex items-center justify-center w-full">
            <div className="w-full flex flex-col items-center justify-center text-center px-4">
              {/* Title skeleton */}
              <div className="space-y-2 mb-4">
                <div className="h-10 sm:h-12 lg:h-14 bg-white/40 rounded-lg w-64 sm:w-80 lg:w-96 mx-auto animate-pulse" />
                <div className="h-10 sm:h-12 lg:h-14 bg-white/30 rounded-lg w-56 sm:w-72 lg:w-80 mx-auto animate-pulse" />
              </div>

              {/* Description skeleton */}
              <div className="space-y-2 mb-6">
                <div className="h-5 bg-white/30 rounded w-72 sm:w-[420px] lg:w-[520px] mx-auto animate-pulse" />
                <div className="h-5 bg-white/25 rounded w-64 sm:w-[360px] lg:w-[460px] mx-auto animate-pulse" />
              </div>

              {/* CTA Button skeleton */}
              <div>
                <div className="h-12 bg-white/35 rounded-full w-44 sm:w-48 mx-auto animate-pulse" />
              </div>
            </div>
          </div>

          {/* Progress indicators skeleton */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full bg-white/40 animate-pulse ${
                    i === 0 ? 'w-8 h-2' : 'w-2 h-2'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
