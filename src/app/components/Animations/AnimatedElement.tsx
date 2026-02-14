'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { useStaggeredAnimation, AnimationDirection } from '../../hooks/useStaggeredAnimation';
import { useEffect, useState } from 'react';
import { useIsDesktop } from '../../hooks/useIsDesktop';

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
 * Animated element that enters from a direction (desktop only).
 * Mobile: no animation — content appears instantly.
 */
export default function AnimatedElement({
  children,
  index = 0,
  direction = 'bottom',
  delay = 0.02,
  duration = 0.4,
  distance = 12,
  className = '',
  ...props
}: AnimatedElementProps) {
  const isDesktop = useIsDesktop();
  const variants = useStaggeredAnimation(index, {
    delay,
    duration,
    direction,
    distance,
  });
  const [animationState, setAnimationState] = useState<'visible' | 'settled' | 'bubbly'>('visible');

  useEffect(() => {
    if (!isDesktop) return;
    const settledTimer = setTimeout(() => setAnimationState('settled'), (index * delay + duration + 0.2) * 1000);
    const bubblyTimer = setTimeout(() => setAnimationState('bubbly'), (index * delay + duration + 0.5) * 1000);
    return () => {
      clearTimeout(settledTimer);
      clearTimeout(bubblyTimer);
    };
  }, [isDesktop, index, delay, duration]);

  if (!isDesktop) {
    return <div className={className} {...(props as unknown as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  }

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

