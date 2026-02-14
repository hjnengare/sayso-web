"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { useIsDesktop } from "../../hooks/useIsDesktop";

interface AnimatedSectionProps {
  children: ReactNode;
  index?: number;
  className?: string;
  id?: string;
}

/**
 * AnimatedSection - Desktop (md+): slide-in reveal. Mobile: no animation (content appears instantly).
 * Respects prefers-reduced-motion on desktop.
 */
export default function AnimatedSection({
  children,
  index = 0,
  className = "",
  id,
}: AnimatedSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const isEven = index % 2 === 0;

  if (!isDesktop) {
    return (
      <section id={id} className={className}>
        {children}
      </section>
    );
  }

  const initial = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 40, x: isEven ? -40 : 40 };

  const whileInView = prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, x: 0 };

  return (
    <motion.section
      id={id}
      className={className}
      initial={initial}
      whileInView={whileInView}
      viewport={{ amount: 0.35, once: false }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.6,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.section>
  );
}

