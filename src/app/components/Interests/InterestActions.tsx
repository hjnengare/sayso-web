"use client";

import { ArrowRight } from "react-feather";

interface InterestActionsProps {
  canProceed: boolean;
  isNavigating: boolean;
  selectedCount: number;
  minSelections: number;
  onContinue: () => void;
}

export default function InterestActions({ 
  canProceed, 
  isNavigating, 
  selectedCount, 
  minSelections, 
  onContinue
}: InterestActionsProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  return (
    <div className="pt-4 space-y-4 enter-fade" style={{ animationDelay: "0.15s" }}>
      <button
        className={`w-full text-sm font-600 py-4 px-4 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press shadow-md ${
          canProceed
            ? 'bg-gradient-to-r from-sage to-sage/80 text-white hover:from-sage/90 hover:to-sage'
            : 'bg-charcoal/10 text-charcoal/40 cursor-not-allowed'
        }`}
        onClick={onContinue}
        disabled={!canProceed}
        aria-label={`Continue with ${selectedCount} selected interests`}
        style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
      >
        {isNavigating ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Continuing...
          </>
        ) : (
          <>
            Continue {selectedCount > 0 && `(${selectedCount} selected)`}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}
