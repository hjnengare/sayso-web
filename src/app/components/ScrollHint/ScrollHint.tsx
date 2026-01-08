"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronDown } from "react-feather";
import { useEffect, useState } from "react";

/**
 * ScrollHint - Floating chevron that bounces to indicate scrollability
 * Hides after user scrolls once
 */
export default function ScrollHint() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 100, damping: 20 });
  const opacity = useTransform(springY, [0, 10], [1, 0.3]);

  useEffect(() => {
    // Bounce animation
    const interval = setInterval(() => {
      y.set(8);
      setTimeout(() => y.set(0), 300);
    }, 2000);

    // Hide after first scroll
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setHasScrolled(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [y]);

  if (hasScrolled) return null;

  return (
    <motion.div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center justify-center"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
    >
      <motion.div
        style={{ y: springY, opacity }}
        className="w-10 h-10 rounded-full bg-navbar-bg/80 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg"
      >
        <ChevronDown className="w-5 h-5 text-white" strokeWidth={2.5} />
      </motion.div>
    </motion.div>
  );
}

