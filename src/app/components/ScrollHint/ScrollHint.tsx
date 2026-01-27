"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * ScrollHint - Floating chevron that bounces to indicate scrollability
 * Visible only at top of page. Fades out on scroll and reappears at top.
 */
export default function ScrollHint() {
  const [showArrow, setShowArrow] = useState(true);
  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 100, damping: 20 });
  const opacity = useTransform(springY, [0, 10], [1, 0.3]);

  useEffect(() => {
    // Bounce animation
    const interval = setInterval(() => {
      y.set(8);
      setTimeout(() => y.set(0), 300);
    }, 2000);

    // Toggle based on scroll position
    const handleScroll = () => {
      setShowArrow(window.scrollY === 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [y]);

  return (
    <motion.div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center justify-center ${
        showArrow ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      }`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: showArrow ? 1 : 0, y: showArrow ? 0 : 10 }}
      transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
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

