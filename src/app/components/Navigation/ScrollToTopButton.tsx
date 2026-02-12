"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronUp } from "lucide-react";

interface ScrollToTopButtonProps {
  threshold?: number;
  ariaLabel?: string;
}

const MOBILE_BREAKPOINT_QUERY = "(max-width: 1023.98px)";

export default function ScrollToTopButton({
  threshold = 360,
  ariaLabel = "Scroll to top",
}: ScrollToTopButtonProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const visibleRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const onViewportChange = () => {
      const nextIsMobile = mediaQuery.matches;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        visibleRef.current = false;
        setIsVisible(false);
      }
    };

    onViewportChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onViewportChange);
      return () => mediaQuery.removeEventListener("change", onViewportChange);
    }

    mediaQuery.addListener(onViewportChange);
    return () => mediaQuery.removeListener(onViewportChange);
  }, []);

  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return;

    const updateVisibility = () => {
      frameRef.current = null;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const nextVisible = scrollTop > threshold;
      if (nextVisible !== visibleRef.current) {
        visibleRef.current = nextVisible;
        setIsVisible(nextVisible);
      }
    };

    const onScroll = () => {
      if (frameRef.current != null) return;
      frameRef.current = window.requestAnimationFrame(updateVisibility);
    };

    updateVisibility();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [isMobile, threshold]);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.button
          type="button"
          onClick={handleScrollToTop}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
          transition={{
            duration: prefersReducedMotion ? 0.12 : 0.22,
            ease: [0.2, 0.8, 0.2, 1],
          }}
          className="fixed right-4 z-40 lg:hidden h-10 w-10 rounded-full border border-charcoal/15 bg-off-white/90 text-charcoal shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-[2px] flex items-center justify-center transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:scale-95 active:opacity-90 motion-reduce:transition-none"
          style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom, 0px) + 4.25rem))" }}
          aria-label={ariaLabel}
        >
          <ChevronUp className="h-4 w-4" strokeWidth={2.25} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

