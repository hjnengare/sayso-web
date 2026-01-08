"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode, useState, useEffect } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  index?: number;
  className?: string;
  id?: string;
}

/**
 * AnimatedSection - Desktop gets slide animations, mobile gets subtle fade
 * Respects prefers-reduced-motion
 */
export default function AnimatedSection({
  children,
  index = 0,
  className = "",
  id,
}: AnimatedSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(true);
  const isEven = index % 2 === 0;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile: subtle fade only
  // Desktop: slide from left/right (alternating) + fade
  const initial = prefersReducedMotion
    ? { opacity: 0 }
    : isMobile
    ? { opacity: 0 }
    : { opacity: 0, y: 40, x: isEven ? -40 : 40 };

  const whileInView = prefersReducedMotion
    ? { opacity: 1 }
    : isMobile
    ? { opacity: 1 }
    : { opacity: 1, y: 0, x: 0 };

  return (
    <motion.section
      id={id}
      className={className}
      initial={initial}
      whileInView={whileInView}
      viewport={{ amount: isMobile ? 0.2 : 0.35, once: false }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : isMobile ? 0.4 : 0.6,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.section>
  );
}

