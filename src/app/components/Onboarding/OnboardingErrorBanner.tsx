"use client";

import { AlertCircle } from "react-feather";

interface OnboardingErrorBannerProps {
  error: Error | string | null;
  className?: string;
}

export default function OnboardingErrorBanner({
  error,
  className = "",
}: OnboardingErrorBannerProps) {
  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <div className={`
      bg-red-50 border border-red-200 rounded-[20px] p-4 
      flex items-start gap-3 animate-fade-in-up delay-100
      ${className}
    `}>
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-semibold text-red-600 flex-1">
        {errorMessage}
      </p>
    </div>
  );
}
