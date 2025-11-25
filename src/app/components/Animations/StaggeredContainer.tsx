'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { usePageAnimation } from '../../hooks/useStaggeredAnimation';

interface StaggeredContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container component that enables staggered animations for children
 * Use this as a wrapper for sections that need staggered entrance animations
 */
export default function StaggeredContainer({
  children,
  className = '',
  ...props
}: StaggeredContainerProps) {
  const variants = usePageAnimation();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

