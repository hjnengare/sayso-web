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
      <div className="relative w-full px-2 py-4 md:p-4">
        <div className="relative h-[65vh] sm:h-[70vh] lg:h-[80vh] w-full overflow-hidden outline-none rounded-[20px] min-h-[400px] shadow-md">
          {/* Background shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-[20px] animate-pulse" />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent rounded-[20px]" />

          {/* Left-aligned content skeleton */}
          <div className="absolute inset-0 z-20 flex items-center justify-start w-full" style={{ marginLeft: '5%' }}>
            <div className="text-left space-y-4 w-full max-w-2xl pr-4">
              {/* Title skeleton */}
              <div className="space-y-2">
                <div className="h-12 bg-slate-300/60 rounded-lg w-96 animate-pulse" />
                <div className="h-12 bg-slate-300/50 rounded-lg w-72 animate-pulse" />
              </div>

              {/* Description skeleton */}
              <div className="space-y-2 pt-2">
                <div className="h-5 bg-slate-300/50 rounded w-full animate-pulse" />
                <div className="h-5 bg-slate-300/50 rounded w-5/6 animate-pulse" />
              </div>

              {/* CTA Button skeleton */}
              <div className="pt-4">
                <div className="h-12 bg-slate-300/60 rounded-full w-40 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Progress indicators skeleton */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full bg-slate-300/40 animate-pulse ${
                    i === 0 ? 'w-8 h-2' : 'w-2 h-2'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
          background: linear-gradient(
            90deg,
            rgba(226, 232, 240, 0.4) 0%,
            rgba(226, 232, 240, 0.8) 50%,
            rgba(226, 232, 240, 0.4) 100%
          );
          background-size: 1000px 100%;
        }
      `}</style>
    </>
  );
}
