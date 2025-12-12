"use client";

import React, { useState, useEffect, useRef } from "react";
import WavyTypedTitle from "./WavyTypedTitle";
import { Fontdiner_Swanky } from "next/font/google";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export interface WavyScrollTitleProps {
  /** Text to display */
  text: string;
  /** HTML tag to render */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Delay per letter during typing (ms) */
  typingSpeedMs?: number;
  /** Delay before typing starts (ms) */
  startDelayMs?: number;
  /** Wave variant: 'subtle' matches Loader exactly, 'ultra-subtle' is more gentle */
  waveVariant?: "subtle" | "ultra-subtle";
  /** Whether wave loops infinitely */
  loopWave?: boolean;
  /** Threshold for intersection observer (0-1) */
  threshold?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

/**
 * WavyTypedTitle that triggers on scroll when it enters the viewport
 */
export const WavyScrollTitle: React.FC<WavyScrollTitleProps> = ({
  text,
  as = "h2",
  className = "",
  style,
  typingSpeedMs = 40,
  startDelayMs = 300,
  waveVariant = "subtle",
  loopWave = false,
  threshold = 0.2,
  rootMargin = "0px 0px -50px 0px",
}) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnimated) return; // Don't set up observer if already animated

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setIsVisible(true);
            setHasAnimated(true);
            // Unobserve after triggering to prevent re-animation
            if (containerRef.current) {
              observer.unobserve(containerRef.current);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [hasAnimated, threshold, rootMargin]);

  // If already animated or visible, show the wavy title
  // Otherwise, show static text with same styling
  if (isVisible || hasAnimated) {
    return (
      <div ref={containerRef}>
        <WavyTypedTitle
          text={text}
          as={as}
          className={className}
          style={style}
          typingSpeedMs={typingSpeedMs}
          startDelayMs={startDelayMs}
          waveVariant={waveVariant}
          loopWave={loopWave}
        />
      </div>
    );
  }

  // Show static text with same styling until it scrolls into view
  const Component = as;
  return (
    <div ref={containerRef}>
      <Component
        className={className}
        style={{
          ...style,
          fontFamily: swanky.style.fontFamily,
        }}
      >
        {text}
      </Component>
    </div>
  );
};

export default WavyScrollTitle;


