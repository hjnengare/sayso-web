"use client";

/**
 * SoftPastelGradient Component
 *
 * Creates a soft, pastel blurred gradient background with smooth transitions
 * using off-white (#E5E0E5) and mulled wine red (#722F37) as base colors.
 * Perfect for page backgrounds with low contrast and dreamy aesthetic.
 *
 * @example
 * // Full page background
 * <div className="relative min-h-[100dvh]">
 *   <SoftPastelGradient />
 *   <div className="relative z-10">Your content here</div>
 * </div>
 *
 * @example
 * // With custom intensity
 * <SoftPastelGradient intensity="subtle" animate={true} />
 */

interface SoftPastelGradientProps {
  /** Visual intensity of the gradient (affects opacity) */
  intensity?: "subtle" | "medium" | "soft";
  /** Enable gentle animation */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Z-index for layering */
  zIndex?: number;
}

export default function SoftPastelGradient({
  intensity = "soft",
  animate = true,
  className = "",
  zIndex = 0,
}: SoftPastelGradientProps) {
  // Base colors
  const offWhite = "#E5E0E5";
  const mulledWine = "#722F37"; // Burgundy/wine red

  // Convert hex to RGB for opacity control
  const mulledWineRgb = "114, 47, 55";

  // Intensity-based opacity levels (low contrast, pastel)
  const opacityMap = {
    subtle: {
      primary: 0.08,   // Very subtle
      secondary: 0.12,
      accent: 0.06,
    },
    medium: {
      primary: 0.15,   // Medium subtle
      secondary: 0.20,
      accent: 0.10,
    },
    soft: {
      primary: 0.12,   // Soft and gentle
      secondary: 0.18,
      accent: 0.08,
    },
  };

  const opacity = opacityMap[intensity];

  // Pastel color variations (lightened versions for softness)
  const pastelColors = {
    // Light pastel wine (pinkish-lavender)
    pastelWine: `rgba(${mulledWineRgb}, ${opacity.primary})`,
    // Softer wine tint
    softWine: `rgba(${mulledWineRgb}, ${opacity.secondary})`,
    // Very light accent
    lightAccent: `rgba(${mulledWineRgb}, ${opacity.accent})`,
    // Off-white base with slight tint
    offWhiteBase: offWhite,
    // Off-white with wine tint
    offWhiteTinted: `rgba(229, 224, 229, 0.95)`,
  };

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex }}
      aria-hidden="true"
    >
      {/* Base off-white background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${pastelColors.offWhiteBase} 0%, ${pastelColors.offWhiteTinted} 100%)`,
        }}
      />

      {/* Blurred gradient orbs for soft transitions */}
      <div className="absolute inset-0">
        {/* Top-left orb - soft wine tint */}
        <div
          className={`absolute -top-32 -left-32 md:-top-48 md:-left-48 w-96 h-96 md:w-[32rem] md:h-[32rem] rounded-full ${
            animate ? "animate-soft-float" : ""
          }`}
          style={{
            background: `radial-gradient(circle, ${pastelColors.pastelWine} 0%, transparent 70%)`,
            filter: "blur(80px)",
            mixBlendMode: "multiply",
          }}
        />

        {/* Top-right orb - lighter accent */}
        <div
          className={`absolute -top-24 -right-24 md:-top-40 md:-right-40 w-80 h-80 md:w-[28rem] md:h-[28rem] rounded-full ${
            animate ? "animate-soft-float-delayed" : ""
          }`}
          style={{
            background: `radial-gradient(circle, ${pastelColors.lightAccent} 0%, transparent 65%)`,
            filter: "blur(90px)",
            mixBlendMode: "multiply",
            animationDelay: "2s",
          }}
        />

        {/* Center-left orb - medium wine */}
        <div
          className={`absolute top-1/2 -left-40 md:-left-56 w-72 h-72 md:w-[24rem] md:h-[24rem] rounded-full -translate-y-1/2 ${
            animate ? "animate-soft-float-slow" : ""
          }`}
          style={{
            background: `radial-gradient(circle, ${pastelColors.softWine} 0%, transparent 60%)`,
            filter: "blur(100px)",
            mixBlendMode: "multiply",
            animationDelay: "1s",
          }}
        />

        {/* Bottom-right orb - soft wine */}
        <div
          className={`absolute -bottom-32 -right-32 md:-bottom-48 md:-right-48 w-96 h-96 md:w-[32rem] md:h-[32rem] rounded-full ${
            animate ? "animate-soft-float" : ""
          }`}
          style={{
            background: `radial-gradient(circle, ${pastelColors.pastelWine} 0%, transparent 70%)`,
            filter: "blur(85px)",
            mixBlendMode: "multiply",
            animationDelay: "3s",
          }}
        />

        {/* Bottom-center orb - very light accent */}
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 md:w-[28rem] md:h-[28rem] rounded-full ${
            animate ? "animate-soft-float-delayed" : ""
          }`}
          style={{
            background: `radial-gradient(circle, ${pastelColors.lightAccent} 0%, transparent 75%)`,
            filter: "blur(95px)",
            mixBlendMode: "multiply",
            animationDelay: "4s",
          }}
        />

        {/* Additional subtle overlay for smooth blending */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, transparent 0%, ${pastelColors.offWhiteBase} 100%)`,
            opacity: 0.3,
          }}
        />
      </div>
    </div>
  );
}

// CSS animations for smooth, gentle movement
export const softPastelGradientStyles = `
  @keyframes soft-float {
    0%, 100% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    33% {
      transform: translate(15px, -20px) scale(1.02);
      opacity: 0.95;
    }
    66% {
      transform: translate(-10px, 15px) scale(0.98);
      opacity: 0.97;
    }
  }

  @keyframes soft-float-delayed {
    0%, 100% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    25% {
      transform: translate(-20px, 10px) scale(1.03);
      opacity: 0.94;
    }
    50% {
      transform: translate(10px, -15px) scale(0.97);
      opacity: 0.96;
    }
    75% {
      transform: translate(15px, 20px) scale(1.01);
      opacity: 0.95;
    }
  }

  @keyframes soft-float-slow {
    0%, 100% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    50% {
      transform: translate(20px, -10px) scale(1.01);
      opacity: 0.96;
    }
  }

  .animate-soft-float {
    animation: soft-float 25s ease-in-out infinite;
  }

  .animate-soft-float-delayed {
    animation: soft-float-delayed 30s ease-in-out infinite;
  }

  .animate-soft-float-slow {
    animation: soft-float-slow 35s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-soft-float,
    .animate-soft-float-delayed,
    .animate-soft-float-slow {
      animation: none !important;
    }
  }
`;

