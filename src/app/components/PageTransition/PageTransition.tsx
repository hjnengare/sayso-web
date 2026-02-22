"use client";

import { m } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

export default function PageTransition({ children, className = "" }: PageTransitionProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Skip animation on initial mount for faster load
    setIsMounted(true);
  }, []);

  // On initial mount, render without animation
  if (!isMounted) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </m.div>
  );
}

