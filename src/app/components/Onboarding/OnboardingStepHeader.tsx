"use client";

import { ReactNode } from "react";

interface OnboardingStepHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export default function OnboardingStepHeader({
  title,
  description,
  subtitle,
  children,
  className = "",
}: OnboardingStepHeaderProps) {
  return (
    <div className={`mb-8 animate-fade-in-up ${className}`}>
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4">
        {title}
      </h1>
      
      {subtitle && (
        <p className="text-base sm:text-lg text-slate-600 mb-4">
          {subtitle}
        </p>
      )}
      
      {description && (
        <p className="text-slate-600 text-lg sm:text-xl leading-relaxed">
          {description}
        </p>
      )}
      
      {children && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </div>
  );
}
