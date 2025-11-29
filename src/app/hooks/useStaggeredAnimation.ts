'use client';

import { useMemo } from 'react';
import { Variants } from 'framer-motion';

export type AnimationDirection = 'top' | 'bottom' | 'left' | 'right' | 'scale';

export interface StaggeredAnimationConfig {
  delay?: number;
  duration?: number;
  direction?: AnimationDirection;
  distance?: number;
}

/**
 * Hook for creating staggered entrance animations with bubbly dance effect
 * 
 * @param index - The index of the element in the staggered sequence
 * @param config - Animation configuration
 * @returns Framer Motion variants for the element
 */
export function useStaggeredAnimation(
  index: number = 0,
  config: StaggeredAnimationConfig = {}
): Variants {
  const {
    delay = 0.05, // Reduced from 0.1 for tighter, more premium stagger
    duration = 0.5, // Reduced from 0.6 for snappier feel
    direction = 'bottom',
    distance = 24, // Reduced from 40 for more subtle movement
  } = config;

  return useMemo(() => {
    const baseDelay = index * delay;
    // Premium spring config: smoother, more refined motion
    const springConfig = {
      type: 'spring' as const,
      stiffness: 180,
      damping: 28,
      mass: 0.9,
    };

    // Determine initial position based on direction - more subtle distances
    const getInitialPosition = () => {
      const subtleDistance = distance * 0.5; // Reduce distance by half for subtlety
      switch (direction) {
        case 'top':
          return { y: -subtleDistance, x: 0, scale: 0.96 };
        case 'bottom':
          return { y: subtleDistance, x: 0, scale: 0.96 };
        case 'left':
          return { x: -subtleDistance, y: 0, scale: 0.96 };
        case 'right':
          return { x: subtleDistance, y: 0, scale: 0.96 };
        case 'scale':
          return { scale: 0.92, y: subtleDistance * 0.5 };
        default:
          return { y: subtleDistance, x: 0, scale: 0.96 };
      }
    };

    const initial = getInitialPosition();

    return {
      hidden: {
        opacity: 0,
        ...initial,
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        transition: {
          ...springConfig,
          delay: baseDelay,
          duration: duration * 0.85, // Slightly faster for premium feel
          ease: [0.16, 1, 0.3, 1], // Premium cubic bezier easing
        },
      },
      settled: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 200,
          damping: 30,
          mass: 0.8,
          delay: baseDelay + duration + 0.1,
        },
      },
      bubbly: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: [1, 1.02, 0.99, 1.01, 1], // Much more subtle scale variation
        transition: {
          type: 'keyframes',
          times: [0, 0.25, 0.5, 0.75, 1],
          duration: 0.8,
          ease: [0.16, 1, 0.3, 1], // Premium easing
        },
      },
    };
  }, [index, delay, duration, direction, distance]);
}

/**
 * Hook for creating page-level animation variants
 */
export function usePageAnimation(): Variants {
  return useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04, // Reduced from 0.08 for tighter, more premium stagger
        delayChildren: 0.05, // Reduced from 0.1 for faster start
      },
    },
  }), []);
}

/**
 * Get a random direction for variety in animations
 */
export function getRandomDirection(): AnimationDirection {
  const directions: AnimationDirection[] = ['top', 'bottom', 'left', 'right', 'scale'];
  return directions[Math.floor(Math.random() * directions.length)];
}

/**
 * Get direction based on index for predictable patterns
 */
export function getDirectionByIndex(index: number): AnimationDirection {
  const directions: AnimationDirection[] = ['top', 'right', 'bottom', 'left', 'scale'];
  return directions[index % directions.length];
}

