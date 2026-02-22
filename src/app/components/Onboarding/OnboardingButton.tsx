"use client";

import { ArrowRight } from "lucide-react";
import { m } from "framer-motion";

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
      return "Complete Setup";
    }

    return "Continue";
  };

  const getButtonColor = () => {
    if (variant === "complete") {
      return canProceed
        ? 'bg-gradient-to-r from-sage to-sage/80 text-white hover:from-sage/90 hover:to-sage'
        : 'bg-charcoal/10 text-charcoal/60 cursor-not-allowed';
    }
    
    // Continue button matches EventCard "Learn more" styling
    return canProceed
      ? 'bg-navbar-bg/90 text-off-white border border-navbar-bg/70 shadow-sm hover:bg-navbar-bg'
      : 'bg-charcoal/10 text-charcoal/60 border border-charcoal/20 cursor-not-allowed shadow-none';
  };

  const handleClick = () => {
    console.log('[OnboardingButton] Button clicked', {
      canProceed,
      isProcessing,
      disabled: !canProceed || isProcessing,
      variant
    });
    if (canProceed && !isProcessing) {
      onClick();
    } else {
      console.warn('[OnboardingButton] Button click ignored - disabled:', {
        canProceed,
        isProcessing
      });
    }
  };

  return (
    <m.button
      type="button"
      className={`w-full min-h-[44px] text-sm font-600 py-3 px-4 rounded-full transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press ${getButtonColor()}`}
      onClick={handleClick}
      disabled={!canProceed || isProcessing}
      style={sfPro}
      whileHover={canProceed && !isProcessing ? { scale: 1.02, y: -2 } : {}}
      whileTap={canProceed && !isProcessing ? { scale: 0.98 } : {}}
      animate={isProcessing ? { opacity: 0.9 } : { opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {isProcessing ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {getButtonText()}
        </>
      ) : (
        <>
          <m.span
            initial={{ x: 0 }}
            whileHover={{ x: 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            {getButtonText()}
          </m.span>
          {variant === "continue" && (
            <m.div
              initial={{ x: 0 }}
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
            >
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </m.div>
          )}
        </>
      )}
    </m.button>
  );
}

