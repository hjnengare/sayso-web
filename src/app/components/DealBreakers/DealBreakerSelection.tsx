"use client";

import { CheckCircle } from "lucide-react";

interface DealBreaker {
  id: string;
  label: string;
  description: string;
  icon: string;
}

interface DealBreakerSelectionProps {
  selectedCount: number;
  maxSelections?: number;
  children: React.ReactNode;
}

export default function DealBreakerSelection({ selectedCount, maxSelections = 3, children }: DealBreakerSelectionProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  return (
    <div className="text-center mb-4">
      <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-2 bg-sage/10 border border-sage/20">
        <span className="text-sm font-semibold text-sage" style={sfPro}>
          {selectedCount} of {maxSelections} selected
        </span>
        {selectedCount > 0 && (
          <CheckCircle className="w-4 h-4 text-sage" />
        )}
      </div>
      <p className="text-sm sm:text-xs text-charcoal/60 py-2" style={sfPro}>
        {selectedCount === 0
          ? "Select at least one deal-breaker to continue"
          : selectedCount >= maxSelections
          ? "Perfect! You've selected the maximum"
          : "Great! Select more or complete setup"}
      </p>
      {children}
    </div>
  );
}
