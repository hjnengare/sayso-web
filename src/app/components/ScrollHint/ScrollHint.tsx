"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * ScrollHint - Floating chevron that bounces to indicate scrollability
 * Visible only at top of page. Fades out on scroll and reappears at top.
 */
export default function ScrollHint() {
  const [showArrow, setShowArrow] = useState(true);

  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 140, damping: 18 });

  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const getScrollY = () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const updateVisibility = () => {
      const currentY = getScrollY();
      // Give a little buffer so tiny scroll / layout shifts don’t flicker
      setShowArrow(currentY < 12);
    };

    const onScroll = () => {
      // throttle to one update per frame
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        updateVisibility();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateVisibility();

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Bounce only while visible
  useEffect(() => {
    if (!showArrow) {
      y.set(0);
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      y.set(10);
      window.setTimeout(() => y.set(0), 260);
    }, 1800);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [showArrow, y]);

  return (
    <motion.div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: showArrow ? 1 : 0, y: showArrow ? 0 : 10 }}
      transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
    >
      <motion.div
        style={{ y: springY }}
        className="w-10 h-10 rounded-full bg-navbar-bg/80 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg"
      >
        <ChevronDown className="w-5 h-5 text-white" strokeWidth={2.5} />
      </motion.div>
    </motion.div>
  );
}
