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
    <div className={`mb-6 animate-fade-in-up ${className}`}>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2">
        {title}
      </h1>
      
      {subtitle && (
        <p className="text-sm text-slate-600 mb-3">
          {subtitle}
        </p>
      )}
      
      {description && (
        <p className="text-slate-600 text-base leading-relaxed">
          {description}
        </p>
      )}
      
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}
