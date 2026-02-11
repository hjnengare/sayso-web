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
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
  if (prefersReducedMotion) return 180;
  return direction === 0 ? 250 : 210;
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

  if (direction === 1) {
    // Forward navigation: keep movement vertical-only to avoid horizontal layout drift.
    return {
      initial: { opacity: 0, x: 0, y: 10, pointerEvents: "auto" as const },
      animate: { opacity: 1, x: 0, y: 0, pointerEvents: "auto" as const },
      exit: { opacity: 0, x: 0, y: -8, pointerEvents: "none" as const },
    };
  }

  if (direction === -1) {
    // Back navigation: keep movement vertical-only to avoid horizontal layout drift.
    return {
      initial: { opacity: 0, x: 0, y: 10, pointerEvents: "auto" as const },
      animate: { opacity: 1, x: 0, y: 0, pointerEvents: "auto" as const },
      exit: { opacity: 0, x: 0, y: -8, pointerEvents: "none" as const },
    };
  }

  // Default transition: smart crossfade + micro vertical shift.
  return {
    initial: { opacity: 0, x: 0, y: 10, pointerEvents: "auto" as const },
    animate: { opacity: 1, x: 0, y: 0, pointerEvents: "auto" as const },
    exit: { opacity: 0, x: 0, y: -8, pointerEvents: "none" as const },
  };
};

export default function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname() ?? "/";
  const prefersReducedMotion = useReducedMotion() ?? false;

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [navigationDirection, setNavigationDirection] = useState<NavigationDirection>(0);
  const [hasMounted, setHasMounted] = useState(false);

  const isFirstRender = useRef(true);
  const previousPathname = useRef(pathname);
  const preserveScrollOnNextRouteRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const scrollToTop = useCallback(() => {
    // Use "instant" to bypass global smooth-scroll and avoid transition/scroll races.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
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
      previousPathname.current = pathname;
      return;
    }

    if (pathname === previousPathname.current) return;

    const shouldPreserveScroll = preserveScrollOnNextRouteRef.current;
    preserveScrollOnNextRouteRef.current = false;
    previousPathname.current = pathname;

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
  }, [pathname, prefersReducedMotion, scrollToTop]);

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
      <div className="min-h-screen w-full" data-page-transition={isTransitioning ? "1" : "0"}>
        {/* Animate only route body content; header/navbar is outside this provider. */}
        <div className="relative min-h-screen w-full overflow-x-clip">
          {hasMounted ? (
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={pathname}
                initial={motionFrames.initial}
                animate={motionFrames.animate}
                exit={motionFrames.exit}
                transition={{
                  duration: durationSeconds,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="min-h-screen w-full will-change-[opacity,transform]"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          ) : (
            // Hydration-safe fallback: keep SSR and initial client tree identical.
            <div className="min-h-screen w-full">
              {children}
            </div>
          )}
        </div>
      </div>
    </PageTransitionContext.Provider>
  );
}
