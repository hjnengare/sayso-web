"use client";

export default function BusinessGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="list-none">
          <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md border border-white/60 ring-1 ring-white/30 shadow-md animate-pulse">
            {/* Image Section Skeleton */}
            <div className="relative overflow-hidden rounded-t-[20px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 h-[200px] sm:h-[180px] md:h-[160px]" />
            
            {/* Content Section Skeleton */}
            <div className="px-4 py-4 space-y-3">
              <div className="h-5 w-3/4 bg-charcoal/10 rounded-lg" />
              <div className="h-4 w-1/2 bg-charcoal/5 rounded" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 bg-charcoal/5 rounded" />
                <div className="h-4 w-20 bg-charcoal/5 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

