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
    delay = 0.1,
    duration = 0.6,
    direction = 'bottom',
    distance = 40,
  } = config;

  return useMemo(() => {
    const baseDelay = index * delay;
    const springConfig = {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
      mass: 0.8,
    };

    // Determine initial position based on direction
    const getInitialPosition = () => {
      switch (direction) {
        case 'top':
          return { y: -distance, x: 0, scale: 0.9 };
        case 'bottom':
          return { y: distance, x: 0, scale: 0.9 };
        case 'left':
          return { x: -distance, y: 0, scale: 0.9 };
        case 'right':
          return { x: distance, y: 0, scale: 0.9 };
        case 'scale':
          return { scale: 0.8, y: 20 };
        default:
          return { y: distance, x: 0, scale: 0.9 };
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
          duration,
        },
      },
      settled: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 20,
          mass: 0.5,
          delay: baseDelay + duration + 0.2, // Start after entrance animation
        },
      },
      bubbly: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: [1, 1.05, 0.98, 1.02, 1],
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 15,
          mass: 0.6,
          duration: 0.6,
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
        staggerChildren: 0.08,
        delayChildren: 0.1,
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

