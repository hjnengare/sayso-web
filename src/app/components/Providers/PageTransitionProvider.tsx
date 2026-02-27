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

export default function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const [isTransitioning, setIsTransitioning] = useState(false);

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

    setIsTransitioning(true);

    if (!shouldPreserveScroll) {
      scrollToTop();
    }

    if (transitionTimeoutRef.current != null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 160);
  }, [routeKey, scrollToTop]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current != null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

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
        <div className="relative min-h-[100dvh] w-full overflow-x-clip">
          {children}
        </div>
      </div>
    </PageTransitionContext.Provider>
  );
}
