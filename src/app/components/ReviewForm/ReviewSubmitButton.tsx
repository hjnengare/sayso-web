"use client";

import { ArrowRight } from "react-feather";
import { useRef } from "react";

interface ReviewSubmitButtonProps {
  isFormValid: boolean;
  onSubmit: () => void;
}

export default function ReviewSubmitButton({ isFormValid, onSubmit }: ReviewSubmitButtonProps) {
  const touchStartTime = useRef<number | null>(null);
  const lastTouchEnd = useRef<number | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent click if it was triggered by a recent touch (mobile devices)
    // This prevents double submission on mobile
    if (lastTouchEnd.current && Date.now() - lastTouchEnd.current < 500) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (!isFormValid) {
      return;
    }
    onSubmit();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!isFormValid) {
      e.preventDefault();
      return;
    }
    touchStartTime.current = Date.now();
    // Add visual feedback for touch
    e.currentTarget.style.opacity = '0.9';
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.opacity = '1';
    
    if (!isFormValid) {
      touchStartTime.current = null;
      return;
    }

    // Only submit if this was a quick tap (not a scroll)
    const touchDuration = touchStartTime.current ? Date.now() - touchStartTime.current : 0;
    if (touchDuration < 300) {
      lastTouchEnd.current = Date.now();
      onSubmit();
    }
    
    touchStartTime.current = null;
  };

  return (
    <div className="px-4 relative z-20">
      <button
        type="button"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full py-3.5 px-5 rounded-full text-sm font-600 transition-all duration-300 relative overflow-hidden touch-manipulation min-h-[48px] z-20 ${isFormValid
            ? "active:bg-navbar-bg/80 active:scale-[0.98] hover:bg-navbar-bg text-white focus:outline-none focus:ring-2 focus:ring-navbar-bg/50 focus:ring-offset-2 group hover:shadow-lg cursor-pointer"
            : "bg-charcoal/20 text-charcoal/40 cursor-not-allowed"
          }`}
        disabled={!isFormValid}
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
          zIndex: 20,
          backgroundColor: isFormValid ? '#7D0F2A' : undefined, // Explicit navbar-bg color
          color: isFormValid ? '#FFFFFF' : undefined,
        }}
        aria-disabled={!isFormValid}
      >
        <span className="relative z-10 flex items-center justify-center space-x-2">
          <span>Submit Review</span>
          {isFormValid && <ArrowRight size={16} className="flex-shrink-0" />}
        </span>
      </button>
    </div>
  );
}
