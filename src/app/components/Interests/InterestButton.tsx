"use client";

import { CheckCircle } from "lucide-react";

interface Interest {
  id: string;
  name: string;
}

interface InterestButtonProps {
  interest: Interest;
  isSelected: boolean;
  isDisabled: boolean;
  isAnimating: boolean;
  onToggle: (id: string) => void;
  index: number;
}

export default function InterestButton({ 
  interest, 
  isSelected, 
  isDisabled, 
  isAnimating, 
  onToggle, 
  index 
}: InterestButtonProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  const delay = Math.min(index, 8) * 0.03 + 0.1;

  return (
    <button
      data-interest-id={interest.id}
      onClick={() => onToggle(interest.id)}
      disabled={isDisabled}
      aria-pressed={isSelected}
      aria-label={`${interest.name}${
        isSelected ? " (selected)" : isDisabled ? " (maximum reached)" : ""
      }`}
      className={`
        enter-stagger
        relative z-30 w-[85%] aspect-square rounded-full transition-all duration-300 ease-out mx-auto min-h-[44px] min-w-[44px] touch-target-large
        focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2
        ${
          isSelected
            ? "bg-gradient-to-br from-coral to-coral/90 text-white border-2 border-white/30 ring-1 ring-coral/30 scale-105 backdrop-blur-sm"
            : isDisabled
            ? "bg-charcoal/5 text-charcoal/40 cursor-not-allowed opacity-60 border border-charcoal/10"
            : "bg-gradient-to-br from-sage to-sage/90 text-white border border-white/20 ring-1 ring-sage/20 hover:bg-sage/90 hover:scale-105 hover:border-white/30 hover:ring-sage/30 active:scale-95 backdrop-blur-sm"
        }
      `}
      style={{ ...sfPro, animationDelay: `${delay}s` }}
      suppressHydrationWarning
    >
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${
          isAnimating ? "animate-bubbly" : ""
        }`}
      >
        <span 
          className="text-[15px] md:text-base font-semibold text-center leading-tight"
          style={{
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
            whiteSpace: 'normal',
            hyphens: 'none',
            WebkitHyphens: 'none',
            msHyphens: 'none',
          }}
        >
          {interest.name}
        </span>
        {isSelected && (
          <div className="absolute top-2 right-2">
            <CheckCircle className="w-5 h-5 text-sage" aria-hidden="true" />
          </div>
        )}
      </div>
    </button>
  );
}
