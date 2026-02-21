"use client";

import { motion, useAnimationControls } from "framer-motion";
import { colors } from '@/app/(dev)/design-system/tokens';
import { useState } from 'react';

interface SaysoLogoProps {
  size?: "small" | "medium" | "large" | "xl";
  className?: string;
  animated?: boolean;
  variant?: "default" | "gradient" | "outline" | "glow";
  interactive?: boolean;
}

export default function SaysoLogo({
  size = "medium",
  className = "",
  animated = true,
  variant = "default",
  interactive = false
}: SaysoLogoProps) {
  const [hoveredLetter, setHoveredLetter] = useState<string | null>(null);

  // Size mappings
  const sizeClasses = {
    small: "text-2xl sm:text-lg",
    medium: "text-2xl sm:text-lg md:text-4xl",
    large: "text-2xl sm:text-4xl md:text-5xl lg:text-6xl",
    xl: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
  };

  // Color mappings for each letter using design system tokens
  const letterColors = {
    S: colors.primary.sage[500],     // Sage
    A: colors.primary.coral[700],   // Red (Navbar burgundy)
    Y: colors.primary.sage[500],     // Sage
    S2: colors.primary.coral[700],  // Red (Navbar burgundy)
    O: colors.primary.sage[500]     // Sage
  };

  // Enhanced variant styles
  const getLetterStyle = (letter: keyof typeof letterColors, isHovered: boolean) => {
    const baseColor = letterColors[letter];

    switch (variant) {
      case "gradient":
        return {
          color: "transparent",
          backgroundImage: isHovered
            ? `linear-gradient(135deg, ${baseColor}, ${colors.primary.coral[400]}, ${baseColor})`
            : `linear-gradient(135deg, ${baseColor}ee, ${baseColor}99, ${baseColor}ee)`,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          backgroundSize: isHovered ? "200% 200%" : "100% 100%",
          filter: isHovered ? "brightness(1.2)" : "brightness(1)",
          textShadow: `0 0 20px ${baseColor}40`,
          transition: "all 0.3s ease"
        };
      case "outline":
        return {
          color: "transparent",
          WebkitTextStroke: `2px ${baseColor}`,
          textShadow: isHovered
            ? `0 0 20px ${baseColor}60, 0 0 40px ${baseColor}30`
            : `0 0 8px ${baseColor}20`,
          filter: isHovered ? "brightness(1.3)" : "brightness(1)",
          transition: "all 0.3s ease"
        };
      case "glow":
        return {
          color: baseColor,
          textShadow: isHovered
            ? `0 0 10px ${baseColor}80, 0 0 20px ${baseColor}60, 0 0 30px ${baseColor}40, 0 0 40px ${baseColor}20`
            : `0 0 8px ${baseColor}60, 0 0 16px ${baseColor}30`,
          filter: isHovered ? "brightness(1.3) saturate(1.2)" : "brightness(1.1)",
          transition: "all 0.3s ease"
        };
      default:
        return {
          color: baseColor,
          textShadow: isHovered
            ? `0 4px 12px ${baseColor}40`
            : "none",
          filter: isHovered ? "brightness(1.2) saturate(1.1)" : "brightness(1)",
          transition: "all 0.3s ease",
          transform: isHovered ? "translateY(-2px)" : "translateY(0)"
        };
    }
  };

  const logoContent = (
    <span 
      className={`font-700 tracking-tight ${sizeClasses[size]} ${className}`}
      style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, letterSpacing: '-0.02em' }}
    >
      {["S", "A", "Y", "S2", "O"].map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          style={getLetterStyle(letter as keyof typeof letterColors, hoveredLetter === letter)}
          className={interactive ? "inline-block cursor-pointer select-none" : "inline-block"}
          onMouseEnter={() => interactive && setHoveredLetter(letter)}
          onMouseLeave={() => interactive && setHoveredLetter(null)}
        >
          {letter === "S2" ? "s" : letter.toLowerCase()}
        </span>
      ))}
    </span>
  );

  if (!animated) {
    return logoContent;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="inline-block"
    >
      <span 
        className={`font-700 tracking-tight ${sizeClasses[size]} ${className}`}
        style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, letterSpacing: '-0.02em' }}
      >
        {["S", "A", "Y", "S2", "O"].map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            initial={{ opacity: 0, y: -20, rotateX: -90 }}
            animate={{
              opacity: 1,
              y: 0,
              rotateX: 0,
            }}
            transition={{
              delay: 0.1 * (index + 1),
              duration: 0.5,
              type: "spring",
              bounce: 0.4,
              stiffness: 200,
              damping: 15
            }}
            whileHover={interactive ? {
              y: -4,
              scale: 1.1,
              transition: { duration: 0.2, type: "spring", stiffness: 400 }
            } : undefined}
            style={getLetterStyle(letter as keyof typeof letterColors, hoveredLetter === letter)}
            className={interactive ? "inline-block cursor-pointer select-none" : "inline-block"}
            onMouseEnter={() => interactive && setHoveredLetter(letter)}
            onMouseLeave={() => interactive && setHoveredLetter(null)}
          >
            {letter === "S2" ? "s" : letter.toLowerCase()}
          </motion.span>
        ))}
      </span>
    </motion.div>
  );
}
