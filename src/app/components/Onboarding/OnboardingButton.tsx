"use client";

import { ArrowRight } from "react-feather";

interface OnboardingButtonProps {
  canProceed: boolean;
  isNavigating?: boolean;
  isLoading?: boolean;
  selectedCount?: number;
  onClick: () => void;
  variant?: "continue" | "complete";
  text?: string;
}

export default function OnboardingButton({
  canProceed,
  isNavigating = false,
  isLoading = false,
  selectedCount,
  onClick,
  variant = "continue",
  text,
}: OnboardingButtonProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  const isProcessing = isNavigating || isLoading;

  const getButtonText = () => {
    if (isProcessing) {
      return variant === "complete" ? "Completing..." : "Loading...";
    }
    
    if (text) {
      return text;
    }

    if (variant === "complete") {
      return `Complete Setup${selectedCount && selectedCount > 0 ? ` (${selectedCount} selected)` : ""}`;
    }

    return `Continue${selectedCount && selectedCount > 0 ? ` (${selectedCount} selected)` : ""}`;
  };

  const getButtonColor = () => {
    if (variant === "complete") {
      return canProceed
        ? 'bg-gradient-to-r from-sage to-sage/80 text-white hover:from-sage/90 hover:to-sage'
        : 'bg-charcoal/10 text-charcoal/40 cursor-not-allowed';
    }
    
    // Default continue button uses sage gradient
    return canProceed
      ? 'bg-gradient-to-r from-sage to-sage/80 text-white hover:from-sage/90 hover:to-sage'
      : 'bg-charcoal/10 text-charcoal/40 cursor-not-allowed';
  };

  return (
    <button
      type="button"
      className={`w-full text-sm font-600 py-4 px-4 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press shadow-md ${getButtonColor()}`}
      onClick={onClick}
      disabled={!canProceed || isProcessing}
      style={sfPro}
    >
      {isProcessing ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {getButtonText()}
        </>
      ) : (
        <>
          {getButtonText()}
          {variant === "continue" && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
        </>
      )}
    </button>
  );
}

