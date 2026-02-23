// src/app/components/Header/HeaderSkeleton.tsx
"use client";

/**
 * Mobile-first skeleton loader for Header component.
 * Matches Header.tsx layout exactly: outer classes, padding, grid, min-heights.
 */
export default function HeaderSkeleton({
  showSearch = true,
}: {
  showSearch?: boolean;
}) {
  // Shimmer block — white-based gradient visible on dark bg-navbar-bg
  const sh = "bg-gradient-to-r from-white/[0.08] via-white/[0.15] to-white/[0.08] animate-shimmer";

  return (
    <header
      className="sticky top-0 left-0 right-0 w-full z-50 bg-navbar-bg shadow-md transition-all duration-300 pt-[var(--safe-area-top)]"
      aria-label="Loading header"
      aria-busy="true"
    >
      {/* Inner wrapper — matches Header.tsx: py-4, responsive px, min-h */}
      <div className="relative py-4 z-[1] w-full md:pl-2 flex items-center h-full min-h-[72px] lg:min-h-[80px]">
        <div className="w-full">

          {/* ── Mobile layout (lg:hidden) — matches Header personal mobile ── */}
          <div className="flex lg:hidden items-center gap-2 w-full min-h-[48px]">
            {/* Logo wordmark skeleton — text-xl italic "Sayso" */}
            <div className="pl-2">
              <div className={`w-[70px] h-6 sm:w-[80px] sm:h-7 rounded-md ${sh}`} />
            </div>

            {/* Right-side icons: search · bell · bookmark · menu */}
            <div className="flex items-center gap-1 ml-auto">
              {showSearch && (
                <div className={`w-10 h-10 rounded-lg ${sh}`} style={{ animationDelay: '0ms' }} />
              )}
              <div className={`w-10 h-10 rounded-lg ${sh}`} style={{ animationDelay: '80ms' }} />
              <div className={`w-10 h-10 rounded-lg ${sh}`} style={{ animationDelay: '160ms' }} />
              <div className={`w-10 h-10 rounded-lg ${sh}`} style={{ animationDelay: '240ms' }} />
            </div>
          </div>

          {/* ── Desktop layout (hidden lg:grid) — matches Header personal desktop ── */}
          <div className="hidden lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-4">
            {/* Left: Logo wordmark — text-3xl italic "Sayso" */}
            <div className="flex items-center">
              <div className={`w-[100px] h-9 rounded-md ${sh}`} />
            </div>

            {/* Center: Nav links — Home · Leaderboard · Discover */}
            <div className="flex justify-center gap-6">
              <div className={`w-14 h-8 rounded-md ${sh}`} style={{ animationDelay: '80ms' }} />
              <div className={`w-24 h-8 rounded-md ${sh}`} style={{ animationDelay: '160ms' }} />
              <div className={`w-20 h-8 rounded-md ${sh}`} style={{ animationDelay: '240ms' }} />
            </div>

            {/* Right: Search bar + icon group */}
            <div className="flex items-center justify-end gap-3">
              {showSearch && (
                <div className={`w-[280px] h-10 rounded-full ${sh}`} style={{ animationDelay: '120ms' }} />
              )}
              {/* Icons: bell · bookmark · profile · settings */}
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-lg ${sh}`} style={{ animationDelay: '300ms' }} />
                <div className={`w-10 h-10 rounded-lg ${sh}`} style={{ animationDelay: '380ms' }} />
                <div className={`w-10 h-10 rounded-lg ${sh}`} style={{ animationDelay: '460ms' }} />
                <div className={`w-10 h-10 rounded-lg ${sh}`} style={{ animationDelay: '540ms' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shimmer keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </header>
  );
}
