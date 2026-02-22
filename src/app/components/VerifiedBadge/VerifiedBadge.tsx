"use client";

import { m } from "framer-motion";
import { Check } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  delay?: number;
}

export default function VerifiedBadge({
  size = "md",
  delay = 0,
}: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <m.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        delay,
        duration: 0.3,
        type: "spring",
        stiffness: 200,
        damping: 10,
      }}
      className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md shadow-premium-sm ring-2 ring-off-white`}
    >
      <Check
        size={iconSizes[size]}
        strokeWidth={3}
        className="text-white"
        aria-label="Verified"
      />
    </m.div>
  );
}
