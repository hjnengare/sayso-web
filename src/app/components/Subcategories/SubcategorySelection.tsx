"use client";

import { CheckCircle } from "lucide-react";

interface SubcategorySelectionProps {
  selectedCount: number;
  maxSelections?: number;
  children: React.ReactNode;
}

export default function SubcategorySelection({ selectedCount, maxSelections = 10, children }: SubcategorySelectionProps) {
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
      <p className="text-sm sm:text-xs text-charcoal/60" style={sfPro}>
        {selectedCount === 0
          ? "Select at least one subcategory to continue"
          : selectedCount >= maxSelections
          ? "Perfect! You've selected the maximum"
          : "Great! Select more or continue"}
      </p>
      {children}
    </div>
  );
}
