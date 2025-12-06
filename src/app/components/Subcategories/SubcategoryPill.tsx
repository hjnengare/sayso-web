"use client";

import { CheckCircle } from "lucide-react";

interface SubcategoryPillProps {
  subcategory: {
    id: string;
    label: string;
    interest_id: string;
  };
  isSelected: boolean;
  isDisabled?: boolean;
  onToggle: (id: string, interestId: string) => void;
}

export default function SubcategoryPill({ subcategory, isSelected, isDisabled = false, onToggle }: SubcategoryPillProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  return (
    <button
      onClick={() => !isDisabled && onToggle(subcategory.id, subcategory.interest_id)}
      disabled={isDisabled}
      className={`
        relative flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2
        ${isSelected
          ? 'border-coral bg-gradient-to-br from-coral to-coral/90 text-white ring-1 ring-coral/30 scale-105 backdrop-blur-sm'
          : isDisabled
          ? 'border-charcoal/10 bg-charcoal/5 text-charcoal/40 cursor-not-allowed opacity-60'
          : 'border-sage/30 bg-gradient-to-br from-sage/10 to-sage/5 text-sage hover:bg-sage/15 hover:border-sage/50 hover:ring-1 hover:ring-sage/20 hover:scale-105 backdrop-blur-sm'
        }
      `}
      style={sfPro}
    >
      <span>{subcategory.label}</span>
      {isSelected && (
        <CheckCircle className="h-4 w-4" />
      )}
    </button>
  );
}
