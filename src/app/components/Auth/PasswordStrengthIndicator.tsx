"use client";

import { Circle } from "lucide-react";
import { PasswordStrength } from "../../utils/validation";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  showChecks?: boolean;
}

export function PasswordStrengthIndicator({ strength, showChecks = true }: PasswordStrengthIndicatorProps) {
  const { score, feedback, checks, color } = strength;

  // Show green if minimum length requirement is met
  const isSuccess = checks.length && score >= 2;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-charcoal/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              score === 0 ? 'w-0 bg-transparent' :
              score === 1 ? 'w-1/4 bg-red-500' :
              score === 2 ? 'w-1/2 bg-yellow-500' :
              score === 3 ? 'w-3/4 bg-sage' :
              'w-full bg-sage'
            }`}
          />
        </div>
        {feedback && (
          <span className={`text-sm sm:text-xs font-medium ${
            isSuccess ? 'text-sage' : color || 'text-charcoal/60'
          }`}>
            {feedback}
          </span>
        )}
      </div>

      {/* Password Requirements Checklist - simplified to just length */}
      {showChecks && (
        <div className="text-sm sm:text-xs">
          <div className={`flex items-center gap-1.5 ${checks.length ? 'text-sage' : 'text-charcoal/60'}`}>
            <Circle className={`w-3 h-3 ${checks.length ? 'fill-sage' : ''}`} />
            <span>6+ characters</span>
          </div>
        </div>
      )}
    </div>
  );
}
