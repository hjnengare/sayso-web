"use client";

import { m, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface StaggerContainerProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
}

export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0,
    },
  },
};

export const staggerItemVariants = {
  initial: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.25, 0.25, 0.75],
    },
  },
};

export default function StaggerContainer({
  children,
  staggerDelay = 0.1,
  initialDelay = 0,
  className,
  ...props
}: StaggerContainerProps) {
  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  };

  return (
    <m.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}
