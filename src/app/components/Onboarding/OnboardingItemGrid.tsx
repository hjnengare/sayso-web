"use client";

import { ReactNode } from "react";

interface OnboardingItemGridProps {
  children: ReactNode;
  columns?: number;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export default function OnboardingItemGrid({
  children,
  columns = 2,
  gap = "md",
  className = "",
}: OnboardingItemGridProps) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns] || "grid-cols-2";

  const gapClass = {
    sm: "gap-2 sm:gap-3",
    md: "gap-3 sm:gap-4",
    lg: "gap-4 sm:gap-6",
  }[gap];

  return (
    <div className={`
      grid ${colClass} ${gapClass}
      animate-fade-in-up delay-100
      ${className}
    `}>
      {children}
    </div>
  );
}
