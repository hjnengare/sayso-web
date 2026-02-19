"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// Default visible card count - matches BusinessRowSkeleton default
// This represents the typical number of cards visible in the viewport before scrolling
export const DEFAULT_VISIBLE_CARD_COUNT = 4;

interface ScrollableSectionProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
  arrowColor?: string;
  enableMobilePeek?: boolean;
  hideArrowsOnDesktop?: boolean;
}

export default function ScrollableSection({
  children,
  className = "",
  showArrows = true,
  arrowColor = "text-charcoal/60",
  enableMobilePeek = false,
  hideArrowsOnDesktop = false,
}: ScrollableSectionProps) {
  const pathname = usePathname();
  const isHomeRoute = pathname === "/" || pathname.startsWith("/home");
  const shouldEnableMobilePeek = enableMobilePeek || isHomeRoute;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const previousScrollLeftRef = useRef(0);

  const syncMobileSnapTargets = () => {
    const container = scrollRef.current;
    if (!container) return;

    const snapTargets = Array.from(container.querySelectorAll<HTMLElement>(".snap-start"));
    if (snapTargets.length === 0) return;

    for (const target of snapTargets) {
      target.removeAttribute("data-mobile-snap-target");
    }

    for (const target of snapTargets) {
      const ancestorSnapTarget = target.parentElement?.closest(".snap-start");
      const isTopLevelSnapTarget = !ancestorSnapTarget || !container.contains(ancestorSnapTarget);
      if (isTopLevelSnapTarget) {
        target.setAttribute("data-mobile-snap-target", "true");
      }
    }
  };

  const checkScrollPosition = () => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const maxScrollLeft = scrollWidth - clientWidth;

    setCanScrollRight(maxScrollLeft > 5);
    setCanScrollLeft(scrollLeft > 5);
    setShowRightArrow(scrollLeft < maxScrollLeft - 10);
    setShowLeftArrow(scrollLeft > 10);

    const delta = scrollLeft - previousScrollLeftRef.current;
    // Requested behavior:
    // - hide while user scrolls/swipes left
    // - show while user scrolls/swipes right
    // For horizontal containers, swipe-left usually increases scrollLeft.
    if (delta > 0.5) {
      setShowSwipeHint(false);
    } else if (delta < -0.5) {
      setShowSwipeHint(true);
    }
    previousScrollLeftRef.current = scrollLeft;
    
    // Calculate scroll progress (0 to 100)
    if (maxScrollLeft > 0) {
      const progress = (scrollLeft / maxScrollLeft) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    } else {
      setScrollProgress(0);
    }
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    previousScrollLeftRef.current = scrollElement.scrollLeft;
    syncMobileSnapTargets();

    checkScrollPosition();

    const handleScroll = () => checkScrollPosition();
    const handleResize = () => {
      syncMobileSnapTargets();
      checkScrollPosition();
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      syncMobileSnapTargets();
      checkScrollPosition();
    });
    observer.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  // Rows often populate asynchronously (fetch + dynamic imports).
  // Re-measure after children settle so mobile hint visibility is accurate.
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement || typeof window === "undefined") return;

    const rafId = window.requestAnimationFrame(() => {
      syncMobileSnapTargets();
      checkScrollPosition();
    });
    const timeoutId = window.setTimeout(() => {
      syncMobileSnapTargets();
      checkScrollPosition();
    }, 120);
    const lateTimeoutId = window.setTimeout(() => {
      syncMobileSnapTargets();
      checkScrollPosition();
    }, 360);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.clearTimeout(lateTimeoutId);
    };
  }, [children, className, shouldEnableMobilePeek]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(max-width: 767px)");

    const updateViewport = () => {
      setIsMobileViewport(mql.matches);
    };

    updateViewport();
    if ("addEventListener" in mql) {
      mql.addEventListener("change", updateViewport);
      return () => mql.removeEventListener("change", updateViewport);
    }

    (mql as unknown as { addListener?: (listener: () => void) => void }).addListener?.(
      updateViewport
    );
    return () => {
      (mql as unknown as { removeListener?: (listener: () => void) => void }).removeListener?.(
        updateViewport
      );
    };
  }, []);

  const scrollRight = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    // On mobile: scroll by 1 full card (100vw minus padding), on larger screens: scroll by 1 card (25% width)
    // Note: Default visible card count is DEFAULT_VISIBLE_CARD_COUNT (4 cards)
    const isMobile = window.innerWidth < 640; // sm breakpoint
    if (isMobile) {
      // On mobile, scroll by one full viewport width (one card at a time)
      const scrollAmount = container.clientWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
      const cardWidth = container.clientWidth * 0.25;
      const gap = 12; // gap-3 on larger screens
    const scrollAmount = cardWidth + gap;
    container.scrollLeft += scrollAmount;
    }
  };

  const scrollLeft = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    // On mobile: scroll by 1 full card (100vw minus padding), on larger screens: scroll by 1 card (25% width)
    // Note: Default visible card count is DEFAULT_VISIBLE_CARD_COUNT (4 cards)
    const isMobile = window.innerWidth < 640; // sm breakpoint
    if (isMobile) {
      // On mobile, scroll by one full viewport width (one card at a time)
      const scrollAmount = container.clientWidth;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      const cardWidth = container.clientWidth * 0.25;
      const gap = 12; // gap-3 on larger screens
    const scrollAmount = cardWidth + gap;
    container.scrollLeft -= scrollAmount;
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={`horizontal-scroll scrollbar-hide scrollable-mobile-center flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:snap-mandatory ${className}`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          overscrollBehaviorY: 'auto',
          touchAction: 'pan-x pan-y',
          scrollSnapType: 'x mandatory',
        } as React.CSSProperties}
      >
        {children}
      </div>

      <style jsx>{`
        @media (max-width: 639px) {
          .scrollable-mobile-center :global(.snap-start[data-mobile-snap-target="true"]) {
            scroll-snap-align: center !important;
            scroll-snap-stop: always !important;
          }

          .scrollable-mobile-center :global(.snap-start:not([data-mobile-snap-target="true"])) {
            scroll-snap-align: none !important;
            scroll-snap-stop: normal !important;
          }
        }

        @keyframes mobile-scroll-indicator-pulse {
          0% {
            opacity: 0.6;
            transform: translate3d(0, 0, 0);
          }
          50% {
            opacity: 1;
            transform: translate3d(4px, 0, 0);
          }
          100% {
            opacity: 0.6;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes mobile-scroll-indicator-pulse-left {
          0% {
            opacity: 0.6;
            transform: translate3d(0, 0, 0);
          }
          50% {
            opacity: 1;
            transform: translate3d(-4px, 0, 0);
          }
          100% {
            opacity: 0.6;
            transform: translate3d(0, 0, 0);
          }
        }

        .mobile-scroll-indicator {
          animation: mobile-scroll-indicator-pulse 1000ms ease-in-out infinite;
        }

        .mobile-scroll-indicator-left {
          animation: mobile-scroll-indicator-pulse-left 1000ms ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .mobile-scroll-indicator,
          .mobile-scroll-indicator-left {
            animation: none;
          }
        }
      `}</style>

      {isHomeRoute && isMobileViewport && canScrollLeft && (
        <div className="pointer-events-none absolute left-2.5 top-1/2 z-30 -translate-y-1/2 md:hidden">
          <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full border border-charcoal/10 bg-off-white/85 px-1.5">
            <svg
              className="mobile-scroll-indicator-left h-3.5 w-3.5 text-charcoal/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5l-7 7 7 7"
              />
            </svg>
          </span>
        </div>
      )}

      {isHomeRoute && isMobileViewport && canScrollRight && showSwipeHint && (
        <div className="pointer-events-none absolute right-2.5 top-1/2 z-30 -translate-y-1/2 md:hidden">
          <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full border border-charcoal/10 bg-off-white/85 px-1.5">
            <svg
              className="mobile-scroll-indicator h-3.5 w-3.5 text-charcoal/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      )}

      {showArrows && (
        <>
          {canScrollLeft && showLeftArrow && (
            <button
              onClick={scrollLeft}
              className={`
                scroll-arrow scroll-arrow-left
                absolute left-2 top-1/2 -translate-y-1/2 z-40
                w-14 h-14 sm:w-12 sm:h-12
                bg-navbar-bg
                rounded-full
                ${shouldEnableMobilePeek ? "hidden sm:flex" : "flex"} items-center justify-center
                ${hideArrowsOnDesktop ? "lg:hidden" : ""}
                transition-all duration-300 ease-out
                active:scale-95
                text-white
                touch-manipulation
                /* Neomorphic styling for mobile */
                shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(139,176,138,0.3)]
                sm:shadow-lg
                hover:bg-card-bg hover:shadow-[6px_6px_12px_rgba(0,0,0,0.12),-6px_-6px_12px_rgba(139,176,138,0.4)]
                sm:hover:shadow-xl
                active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(139,176,138,0.3)]
                sm:active:shadow-lg
                border border-sage/20
              `}
              aria-label="Scroll left"
            >
              <svg
                className="w-5 h-5 sm:w-5 sm:h-5 rotate-180 arrow-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
          {canScrollRight && showRightArrow && (
            <button
              onClick={scrollRight}
              className={`
                scroll-arrow scroll-arrow-right
                absolute right-2 top-1/2 -translate-y-1/2 z-40
                w-14 h-14 sm:w-12 sm:h-12
                bg-navbar-bg
                rounded-full
                ${shouldEnableMobilePeek ? "hidden sm:flex" : "flex"} items-center justify-center
                ${hideArrowsOnDesktop ? "lg:hidden" : ""}
                transition-all duration-300 ease-out
                active:scale-95
                text-white
                touch-manipulation
                /* Neomorphic styling for mobile */
                shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(139,176,138,0.3)]
                sm:shadow-lg
                hover:bg-card-bg hover:shadow-[6px_6px_12px_rgba(0,0,0,0.12),-6px_-6px_12px_rgba(139,176,138,0.4)]
                sm:hover:shadow-xl
                active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(139,176,138,0.3)]
                sm:active:shadow-lg
                border border-sage/20
              `}
              aria-label="Scroll right"
            >
              <svg
                className="w-5 h-5 sm:w-5 sm:h-5 arrow-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
