"use client";

import React from "react";
import { m } from "framer-motion";

// =============================================================================
// TYPES
// =============================================================================

export type LoaderSize = "xs" | "sm" | "md" | "lg" | "xl";
export type LoaderVariant = "spinner" | "dots" | "pulse" | "bars" | "wavy";
export type LoaderColor = "sage" | "coral" | "charcoal" | "white" | "current";

export interface LoaderProps {
  /** Size of the loader */
  size?: LoaderSize;
  /** Visual variant */
  variant?: LoaderVariant;
  /** Color theme */
  color?: LoaderColor;
  /** Optional text to display below loader */
  text?: string;
  /** Full page centered loader */
  fullPage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// SIZE CONFIGURATIONS
// =============================================================================

const sizeConfig: Record<LoaderSize, { spinner: string; dot: string; bar: string; text: string }> = {
  xs: { spinner: "w-3 h-3 border-2", dot: "w-1.5 h-1.5", bar: "w-1 h-3", text: "text-sm sm:text-xs" },
  sm: { spinner: "w-4 h-4 border-2", dot: "w-2 h-2", bar: "w-1 h-4", text: "text-sm" },
  md: { spinner: "w-6 h-6 border-2", dot: "w-2.5 h-2.5", bar: "w-1.5 h-5", text: "text-sm" },
  lg: { spinner: "w-8 h-8 border-[3px]", dot: "w-3 h-3", bar: "w-2 h-6", text: "text-base" },
  xl: { spinner: "w-12 h-12 border-[3px]", dot: "w-4 h-4", bar: "w-2.5 h-8", text: "text-lg" },
};

const colorConfig: Record<LoaderColor, { border: string; bg: string; text: string }> = {
  sage: { border: "border-sage", bg: "bg-card-bg", text: "text-sage" },
  coral: { border: "border-coral", bg: "bg-coral", text: "text-coral" },
  charcoal: { border: "border-charcoal", bg: "bg-charcoal", text: "text-charcoal" },
  white: { border: "border-white", bg: "bg-white", text: "text-white" },
  current: { border: "border-current", bg: "bg-current", text: "text-current" },
};

// =============================================================================
// LOADER VARIANTS
// =============================================================================

const SpinnerLoader: React.FC<{ size: LoaderSize; color: LoaderColor }> = ({ size, color }) => {
  const sizeClass = sizeConfig[size].spinner;
  const colorClass = colorConfig[color].border;

  return (
    <div
      className={`${sizeClass} ${colorClass} border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
};

const WavyDotsLoader: React.FC<{ size: LoaderSize; color: LoaderColor }> = ({ size, color }) => {
  const dotClass = sizeConfig[size].dot;
  const bgClass = colorConfig[color].bg;

  return (
    <div className="flex items-center gap-1.5" role="status" aria-label="Loading">
      {[0, 1, 2, 3].map((i) => ( // 4 dots
        <m.div
          key={i}
          className={`${dotClass} ${bgClass} rounded-full`}
          animate={{
            y: [0, -5, 0], // Wavy animation on y-axis
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1, // Staggered delay
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const DotsLoader: React.FC<{ size: LoaderSize; color: LoaderColor }> = ({ size, color }) => {
  // Use the 4-dot wavy loader for consistency
  return <WavyDotsLoader size={size} color={color} />;
};

const PulseLoader: React.FC<{ size: LoaderSize; color: LoaderColor }> = ({ size, color }) => {
  const sizeClass = sizeConfig[size].spinner;
  const bgClass = colorConfig[color].bg;

  return (
    <div className="relative" role="status" aria-label="Loading">
      <div className={`${sizeClass} ${bgClass} rounded-full opacity-75 animate-ping absolute`} />
      <div className={`${sizeClass} ${bgClass} rounded-full relative`} />
    </div>
  );
};

const BarsLoader: React.FC<{ size: LoaderSize; color: LoaderColor }> = ({ size, color }) => {
  // Use the 4-dot wavy loader for consistency
  return <WavyDotsLoader size={size} color={color} />;
};

// =============================================================================
// MAIN LOADER COMPONENT
// =============================================================================

export const Loader: React.FC<LoaderProps> = ({
  size = "md",
  variant = "spinner",
  color = "sage",
  text,
  fullPage = false,
  className = "",
}) => {
  const textClass = sizeConfig[size].text;
  const textColorClass = colorConfig[color].text;

  const loaderElement = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      {variant === "spinner" && <SpinnerLoader size={size} color={color} />}
      {variant === "dots" && <DotsLoader size={size} color={color} />}
      {variant === "pulse" && <PulseLoader size={size} color={color} />}
      {variant === "bars" && <BarsLoader size={size} color={color} />}
      {variant === "wavy" && <WavyDotsLoader size={size} color={color} />}
      
      {text && (
        <p className={`${textClass} ${textColorClass} opacity-70 font-urbanist font-500`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center">
        {loaderElement}
      </div>
    );
  }

  return loaderElement;
};

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/** Page-level loader with full page centering */
export const PageLoader: React.FC<Omit<LoaderProps, "fullPage">> = (props) => (
  <Loader {...props} fullPage />
);

/** Inline loader for buttons and small spaces */
export const InlineLoader: React.FC<Omit<LoaderProps, "fullPage" | "text">> = (props) => (
  <Loader {...props} size={props.size || "xs"} />
);

/** Content loader */
export const ContentLoader: React.FC<Omit<LoaderProps, "fullPage">> = (props) => (
  <Loader {...props} />
);

export default Loader;

