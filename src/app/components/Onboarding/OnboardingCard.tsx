"use client";

import { ReactNode } from "react";

interface OnboardingCardProps {
  children: ReactNode;
  className?: string;
}

export default function OnboardingCard({ children, className = "" }: OnboardingCardProps) {
  return (
    <div
      className={`
        bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-2xl sm:rounded-2xl px-2 md:px-4 py-4 md:py-6 mb-2 relative overflow-visible
        border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-premium
        transition-all duration-300 hover:border-white/80 hover:-translate-y-1 hover:shadow-premiumHover
        onboarding-card ${className}
      `}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
