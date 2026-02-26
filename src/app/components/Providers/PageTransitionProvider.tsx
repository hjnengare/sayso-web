"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";

type NavigationDirection = -1 | 0 | 1;

interface PageTransitionContextType {
  isTransitioning: boolean;
  setTransitioning: (value: boolean) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error("usePageTransition must be used within a PageTransitionProvider");
  }
  return context;
}

interface PageTransitionProviderProps {
  children: ReactNode;
}

const getTransitionDurationMs = (
  direction: NavigationDirection,
  prefersReducedMotion: boolean,
) => {
  if (prefersReducedMotion) return 120;
  return direction === 0 ? 150 : 120;
};

const getMotionFrames = (
  direction: NavigationDirection,
  prefersReducedMotion: boolean,
) => {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 0, x: 0, y: 0, pointerEvents: "auto" as const },
      animate: { opacity: 1, x: 0, y: 0, pointerEvents: "auto" as const },
      exit: { opacity: 0, x: 0, y: 0, pointerEvents: "none" as const },
    };
  }

  // Simplified transitions: opacity-only for faster page transitions
  // Removed y-axis movement to reduce layout calculations
  return {
    initial: { opacity: 0, x: 0, y: 0, pointerEvents: "auto" as const },
    animate: { opacity: 1, x: 0, y: 0, pointerEvents: "auto" as const },
    exit: { opacity: 0, x: 0, y: 0, pointerEvents: "none" as const },
  };
};

export default function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const routeKey = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [navigationDirection, setNavigationDirection] = useState<NavigationDirection>(0);
  const [hasMounted, setHasMounted] = useState(false);

  const isFirstRender = useRef(true);
  const previousRouteKey = useRef(routeKey);
  const preserveScrollOnNextRouteRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const scrollToTop = useCallback(() => {
    // Reset all common scroll roots to avoid browser/platform-specific misses.
    const resetScroll = () => {
      if (typeof document === "undefined") return;
      const scrollingRoot = document.scrollingElement ?? document.documentElement;
      scrollingRoot.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    };

    resetScroll();
    // Run once more after layout settles to avoid transition timing races.
    window.requestAnimationFrame(resetScroll);
  }, []);

  // Preserve native restoration for browser back/forward navigation.
  useEffect(() => {
    setHasMounted(true);

    const onPopState = () => {
      preserveScrollOnNextRouteRef.current = true;
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousRouteKey.current = routeKey;
      return;
    }

    if (routeKey === previousRouteKey.current) return;

    const shouldPreserveScroll = preserveScrollOnNextRouteRef.current;
    preserveScrollOnNextRouteRef.current = false;
    previousRouteKey.current = routeKey;

    // Back/forward can be derived from popstate; otherwise default to crossfade + micro shift.
    const nextDirection: NavigationDirection = shouldPreserveScroll ? -1 : 0;
    setNavigationDirection(nextDirection);
    setIsTransitioning(true);

    if (!shouldPreserveScroll) {
      // Maintain existing behavior: new push navigation starts from top.
      scrollToTop();
    }

    if (transitionTimeoutRef.current != null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }

    const nextDurationMs = getTransitionDurationMs(nextDirection, prefersReducedMotion);
    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, nextDurationMs + 60);
  }, [prefersReducedMotion, routeKey, scrollToTop]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current != null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const motionFrames = useMemo(
    () => getMotionFrames(navigationDirection, prefersReducedMotion),
    [navigationDirection, prefersReducedMotion],
  );
  const durationSeconds = getTransitionDurationMs(navigationDirection, prefersReducedMotion) / 1000;

  const value = useMemo(
    () => ({
      isTransitioning,
      setTransitioning: setIsTransitioning,
    }),
    [isTransitioning],
  );

  return (
    <PageTransitionContext.Provider value={value}>
      <div className="min-h-[100dvh] w-full" data-page-transition={isTransitioning ? "1" : "0"}>
        {/* Animate only route body content; header/navbar is outside this provider. */}
        <div className="relative min-h-[100dvh] w-full overflow-x-clip">
          {hasMounted ? (
            <AnimatePresence initial={false} mode="wait">
              <m.div
                key={routeKey}
                initial={motionFrames.initial}
                animate={motionFrames.animate}
                exit={motionFrames.exit}
                transition={{
                  duration: durationSeconds,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="min-h-[100dvh] w-full will-change-[opacity,transform]"
              >
                {children}
              </m.div>
            </AnimatePresence>
          ) : (
            // Hydration-safe fallback: keep SSR and initial client tree identical.
            <div className="min-h-[100dvh] w-full">
              {children}
            </div>
          )}
        </div>
      </div>
    </PageTransitionContext.Provider>
  );
}
