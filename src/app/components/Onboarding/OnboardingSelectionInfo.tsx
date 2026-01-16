"use client";

import { ReactNode } from "react";

interface OnboardingSelectionInfoProps {
  selectedCount: number;
  minSelections?: number;
  maxSelections?: number;
  singular?: string;
  plural?: string;
  children?: ReactNode;
  className?: string;
}

export default function OnboardingSelectionInfo({
  selectedCount,
  minSelections,
  maxSelections,
  singular = "item",
  plural = "items",
  children,
  className = "",
}: OnboardingSelectionInfoProps) {
  const itemText = selectedCount === 1 ? singular : plural;
  
  const getSelectionStatus = () => {
    const parts: string[] = [];
    
    parts.push(`${selectedCount} ${itemText} selected`);
    
    if (maxSelections) {
      parts.push(`Max ${maxSelections}`);
    }
    
    if (minSelections && selectedCount < minSelections) {
      parts.push(`Need ${minSelections - selectedCount} more`);
    }
    
    return parts.join(" • ");
  };

  const isNearMax = maxSelections && selectedCount === maxSelections;
  const isAtMin = minSelections && selectedCount >= minSelections;

  return (
    <div className={`mb-4 ${className}`}>
      <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
        isNearMax
          ? "bg-orange-50 text-orange-700 border border-orange-200"
          : isAtMin
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-slate-100 text-slate-700 border border-slate-200"
      }`}>
        {getSelectionStatus()}
      </div>
      
      {children && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}
