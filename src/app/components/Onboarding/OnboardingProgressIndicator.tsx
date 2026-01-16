"use client";

import { ReactNode } from "react";

interface OnboardingProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
  showLabels?: boolean;
  labels?: string[];
}

export default function OnboardingProgressIndicator({
  currentStep,
  totalSteps,
  className = "",
  showLabels = false,
  labels = [],
}: OnboardingProgressIndicatorProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress bar */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-sage to-sage/80 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step indicator */}
      {showLabels && labels.length > 0 && (
        <div className="flex justify-between text-sm text-slate-600 px-1">
          {labels.map((label, idx) => (
            <span
              key={idx}
              className={`
                transition-colors duration-300
                ${idx < currentStep ? "text-sage font-semibold" : ""}
              `}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Numeric indicator */}
      {!showLabels && (
        <p className="text-sm text-slate-600 text-right font-medium">
          Step {currentStep} of {totalSteps}
        </p>
      )}
    </div>
  );
}
