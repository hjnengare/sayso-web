'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { useStaggeredAnimation, AnimationDirection } from '../../hooks/useStaggeredAnimation';
import { useEffect, useState } from 'react';

interface AnimatedElementProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  index?: number;
  direction?: AnimationDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
}

/**
 * Animated element that enters from a direction and does a bubbly dance
 * 
 * @example
 * <AnimatedElement index={0} direction="top">
 *   <YourContent />
 * </AnimatedElement>
 */
export default function AnimatedElement({
  children,
  index = 0,
  direction = 'bottom',
  delay = 0.1,
  duration = 0.6,
  distance = 40,
  className = '',
  ...props
}: AnimatedElementProps) {
  const variants = useStaggeredAnimation(index, {
    delay,
    duration,
    direction,
    distance,
  });
  const [animationState, setAnimationState] = useState<'visible' | 'settled' | 'bubbly'>('visible');

  useEffect(() => {
    // Sequence: visible -> settled -> bubbly dance
    const settledTimer = setTimeout(() => {
      setAnimationState('settled');
    }, (index * delay + duration + 0.2) * 1000);

    const bubblyTimer = setTimeout(() => {
      setAnimationState('bubbly');
    }, (index * delay + duration + 0.5) * 1000);

    return () => {
      clearTimeout(settledTimer);
      clearTimeout(bubblyTimer);
    };
  }, [index, delay, duration]);

  return (
    <motion.div
      initial="hidden"
      animate={animationState}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

