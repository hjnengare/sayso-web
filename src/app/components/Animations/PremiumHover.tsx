"use client";

import { m, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface PremiumHoverProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  scale?: number;
  rotateZ?: number;
  shadowIntensity?: "light" | "medium" | "strong";
  duration?: number;
}

export default function PremiumHover({
  children,
  scale = 1.02,
  rotateZ = 0,
  shadowIntensity = "medium",
  duration = 0.3,
  className,
  ...props
}: PremiumHoverProps) {
  const shadowClasses = {
    light: "hover:shadow-lg",
    medium: "",
    strong: "hover:shadow-lg",
  };

  return (
    <m.div
      whileHover={{
        scale,
        rotateZ,
        transition: {
          duration,
          ease: [0.25, 0.25, 0.25, 0.75],
        },
      }}
      whileTap={{
        scale: scale * 0.98,
        transition: {
          duration: 0.1,
        },
      }}
      className={`transition-shadow duration-300 ${shadowClasses[shadowIntensity]} ${className || ""}`}
      {...props}
    >
      {children}
    </m.div>
  );
}
