"use client";

import { ReactNode } from "react";

interface OnboardingActionBarProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export default function OnboardingActionBar({
  children,
  className = "",
  align = "center",
}: OnboardingActionBarProps) {
  const alignClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align];

  return (
    <div className={`
      flex ${alignClass} gap-3 mt-8 pb-6 px-2
      animate-fade-in-up delay-200
      ${className}
    `}>
      {children}
    </div>
  );
}
