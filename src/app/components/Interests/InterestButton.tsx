"use client";

import { memo } from "react";
import { m } from "framer-motion";
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
  shouldShake?: boolean;
  onToggle: (id: string) => void;
  index: number;
}

const buttonVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.9,
  },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: Math.min(index, 8) * 0.03 + 0.1,
      duration: 0.4,
      ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number],
    },
  }),
  selected: {
    scale: 1.05,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
  unselected: {
    scale: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
  tap: {
    scale: 0.95,
  },
  bounce: {
    scale: [1, 1.08, 1],
    transition: {
      duration: 0.35,
      ease: "easeOut" as const,
    },
  },
  shake: {
    x: [0, -4, 4, -3, 2, 0],
    transition: {
      duration: 0.35,
      ease: "easeInOut" as const,
    },
  },
};

const checkIconVariants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 25,
    },
  },
};

function InterestButton({ 
  interest, 
  isSelected, 
  isDisabled, 
  isAnimating, 
  shouldShake = false,
  onToggle, 
  index 
}: InterestButtonProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  return (
    <m.button
      data-interest-id={interest.id}
      onClick={() => onToggle(interest.id)}
      disabled={isDisabled}
      aria-pressed={isSelected}
      aria-label={`${interest.name}${
        isSelected ? " (selected)" : isDisabled ? " (maximum reached)" : ""
      }`}
      variants={buttonVariants}
      initial="initial"
      animate={[
        "animate",
        isSelected ? "selected" : "unselected",
        ...(isAnimating ? ["bounce"] : []),
        ...(shouldShake ? ["shake"] : []),
      ]}
      whileHover={!isDisabled && !isSelected ? "hover" : undefined}
      whileTap={!isDisabled ? "tap" : undefined}
      custom={index}
      className={`
        relative z-30 w-[85%] aspect-square rounded-full mx-auto min-h-[44px] min-w-[44px] touch-target-large
        focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2
        ${
          isSelected
            ? "bg-gradient-to-br from-coral to-coral/90 text-white border-2 border-white/30 ring-1 ring-coral/30 md:backdrop-blur-sm"
            : isDisabled
            ? "bg-charcoal/5 text-charcoal/60 cursor-not-allowed opacity-60 border border-charcoal/10"
            : "bg-gradient-to-br from-sage to-sage/90 text-white border border-white/20 ring-1 ring-sage/20 md:backdrop-blur-sm"
        }
      `}
      style={sfPro}
      suppressHydrationWarning
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
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
          {typeof interest.name === 'string' ? interest.name : String(interest.name || interest.id)}
        </span>
        {isSelected && (
          <m.div
            className="absolute top-2 right-2"
            variants={checkIconVariants}
            initial="hidden"
            animate="visible"
          >
            <CheckCircle className="w-5 h-5 text-sage" aria-hidden="true" />
          </m.div>
        )}
      </div>
    </m.button>
  );
}

export default memo(InterestButton);
