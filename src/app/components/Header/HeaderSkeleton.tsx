// src/app/components/Header/HeaderSkeleton.tsx
"use client";

const sf = {
  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
} as const;

export default function HeaderSkeleton() {
  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg/90 shadow-md border-b border-sage/10 transition-all duration-300"
      aria-hidden="true"
      style={sf}
    >
      <div className="relative z-[1] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 w-full max-w-[1700px] py-3.5 md:py-6">
        <div className="flex items-center justify-between gap-6">
          {/* Logo skeleton */}
          <div className="flex-shrink-0 relative">
            <div className="relative scale-90 sm:scale-[0.72] origin-left">
              <div className="w-[100px] h-[40px] bg-gradient-to-r from-white/20 via-white/15 to-white/20 rounded-[12px] animate-pulse" />
            </div>
          </div>

          {/* Desktop Nav skeleton - mimics DesktopNav component */}
          <nav className="hidden md:flex items-center flex-1 justify-between gap-4 lg:gap-6">
            {/* Center: Navigation Links */}
            <div className="flex items-center space-x-1 lg:space-x-3 flex-1 justify-center">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className="h-8 w-24 bg-gradient-to-r from-white/15 to-white/10 rounded-lg animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>

            {/* Right side icon buttons - mimics action buttons on desktop */}
            <div className="hidden lg:flex items-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className="w-11 h-11 bg-gradient-to-r from-white/15 to-white/10 rounded-lg animate-pulse shadow-sm"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </nav>

          {/* Action buttons skeleton - visible on smaller screens */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Mobile notification button */}
            <div className="md:hidden w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-r from-white/15 to-white/10 rounded-lg animate-pulse shadow-md" />
            
            {/* Desktop-only icons (hidden on md, shown on lg) */}
            <div className="hidden md:flex lg:hidden items-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className="w-11 h-11 bg-gradient-to-r from-white/15 to-white/10 rounded-lg animate-pulse shadow-sm"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>

            {/* Mobile menu hamburger skeleton */}
            <div className="md:hidden w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-r from-white/15 to-white/10 rounded-lg animate-pulse shadow-md" />
          </div>
        </div>
      </div>
    </header>
  );
}
