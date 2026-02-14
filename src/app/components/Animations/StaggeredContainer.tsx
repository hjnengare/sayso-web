'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { usePageAnimation } from '../../hooks/useStaggeredAnimation';
import { useIsDesktop } from '../../hooks/useIsDesktop';

interface StaggeredContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container that enables staggered animations for children on desktop.
 * Mobile: no animation — content appears instantly.
 */
export default function StaggeredContainer({
  children,
  className = '',
  ...props
}: StaggeredContainerProps) {
  const isDesktop = useIsDesktop();
  const variants = usePageAnimation();

  if (!isDesktop) {
    return (
      <div className={className} {...(props as unknown as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

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

