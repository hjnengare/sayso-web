"use client";

import React, { useState, useEffect, useMemo } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface WavyTypedTitleProps {
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
  /** Vertical movement height for wave (px) - overrides waveVariant if set */
  waveAmplitudePx?: number;
  /** Wave animation duration (ms) - overrides waveVariant if set */
  waveDurationMs?: number;
  /** Phase offset between letters (ms) - overrides waveVariant if set */
  waveStaggerMs?: number;
  /** Whether wave loops infinitely */
  loopWave?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const WavyTypedTitle: React.FC<WavyTypedTitleProps> = ({
  text,
  as: Component = "h1",
  className = "",
  style,
  typingSpeedMs = 40,
  startDelayMs = 300,
  waveVariant = "subtle",
  waveAmplitudePx,
  waveDurationMs,
  waveStaggerMs,
  loopWave = true,
}) => {
  // Wave configuration based on variant (matches Loader exactly for 'subtle')
  const waveConfig = useMemo(() => {
    if (waveAmplitudePx !== undefined || waveDurationMs !== undefined || waveStaggerMs !== undefined) {
      // Custom values override variant
      return {
        amplitude: waveAmplitudePx ?? 5,
        duration: waveDurationMs ?? 600,
        stagger: waveStaggerMs ?? 100,
      };
    }

    // Variant-based defaults
    if (waveVariant === "ultra-subtle") {
      return {
        amplitude: 3,
        duration: 800,
        stagger: 50,
      };
    }

    // 'subtle' - matches Loader exactly: y: [0, -5, 0], duration: 0.6s, stagger: 0.1s
    return {
      amplitude: 5,
      duration: 600,
      stagger: 100,
    };
  }, [waveVariant, waveAmplitudePx, waveDurationMs, waveStaggerMs]);

  const { amplitude, duration, stagger } = waveConfig;
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Split text into characters (preserve spaces)
  const characters = useMemo(() => {
    return text.split("");
  }, [text]);

  // Typing animation
  useEffect(() => {
    if (prefersReducedMotion) {
      // Show all letters immediately if reduced motion is preferred
      setVisibleCount(characters.length);
      setIsTypingComplete(true);
      return;
    }

    // Initial delay
    const startTimeout = setTimeout(() => {
      let currentIndex = 0;

      const typeNext = () => {
        if (currentIndex < characters.length) {
          const char = characters[currentIndex];
          const isSpace = char === " ";

          // Spaces appear immediately or with minimal delay
          const delay = isSpace ? Math.max(10, typingSpeedMs * 0.2) : typingSpeedMs;

          setTimeout(() => {
            setVisibleCount((prev) => {
              const next = prev + 1;
              if (next === characters.length) {
                setIsTypingComplete(true);
              }
              return next;
            });
            currentIndex++;
            if (currentIndex < characters.length) {
              typeNext();
            }
          }, delay);
        }
      };

      typeNext();
    }, startDelayMs);

    return () => clearTimeout(startTimeout);
  }, [characters, typingSpeedMs, startDelayMs, prefersReducedMotion]);

  // Generate unique animation name per instance
  const animationName = useMemo(() => {
    return `wavy-title-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // CSS keyframes for wave animation (matches Loader: y: [0, -amplitude, 0])
  const waveKeyframes = useMemo(() => {
    return `
      @keyframes ${animationName} {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-${amplitude}px);
        }
      }
    `;
  }, [animationName, amplitude]);

  // Inject keyframes into document head
  useEffect(() => {
    if (typeof document !== "undefined") {
      const styleId = `wavy-title-style-${animationName}`;
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = styleId;
        styleElement.textContent = waveKeyframes;
        document.head.appendChild(styleElement);
      } else {
        styleElement.textContent = waveKeyframes;
      }

      return () => {
        const element = document.getElementById(styleId);
        if (element) {
          element.remove();
        }
      };
    }
  }, [animationName, waveKeyframes]);

  return (
    <>
      <Component
        className={className}
        aria-label={text}
        style={{
          // CRITICAL: Apply style prop FIRST - fontFamily must be set immediately (before typing)
          // This ensures Swanky font is applied from the very start
          ...(style || {}),
        }}
      >
        <span className="inline-block" style={{ fontFamily: "inherit", wordBreak: "keep-all", overflowWrap: "normal" }}>
          {characters.map((char, index) => {
            const isVisible = index < visibleCount;
            const isSpace = char === " ";
            const shouldAnimate = isTypingComplete && !prefersReducedMotion;

            return (
              <span
                key={`${char}-${index}`}
                aria-hidden="true"
                className="inline-block"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(4px)",
                  transition: isVisible
                    ? `opacity 200ms ease-out, transform 200ms ease-out`
                    : "none",
                  // Use separate animation properties to avoid mixing shorthand and non-shorthand
                  animationName: shouldAnimate ? animationName : "none",
                  animationDuration: shouldAnimate ? `${duration}ms` : "0ms",
                  animationTimingFunction: shouldAnimate ? "ease-in-out" : "ease",
                  animationIterationCount: shouldAnimate && loopWave ? "infinite" : shouldAnimate ? "1" : "0",
                  animationDelay: shouldAnimate ? `${index * stagger}ms` : "0ms",
                  willChange: shouldAnimate ? "transform" : "auto",
                  // Preserve space width even when hidden
                  minWidth: isSpace ? "0.25em" : "auto",
                  // CRITICAL: Inherit font from parent Component - ensures Swanky is applied from start
                  fontFamily: "inherit",
                }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            );
          })}
        </span>
      </Component>
    </>
  );
};

export default WavyTypedTitle;

