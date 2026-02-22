"use client";

import { m, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface FadeInUpProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
}

export default function FadeInUp({
  children,
  delay = 0,
  duration = 0.6,
  distance = 30,
  className,
  ...props
}: FadeInUpProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.25, 0.25, 0.75],
      }}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}
