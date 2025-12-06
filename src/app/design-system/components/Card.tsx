/**
 * CARD COMPONENT - BLABBR DESIGN SYSTEM
 *
 * Standardized card component for consistent layout and styling
 * Supports business cards, content cards, and other card variations
 */

import React, { forwardRef, ReactNode } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: ReactNode;

  /** Card variant */
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';

  /** Card size/padding */
  size?: 'sm' | 'md' | 'lg';

  /** Enable hover effects */
  hoverable?: boolean;

  /** Enable premium hover effects with motion */
  premium?: boolean;

  /** Make card clickable */
  clickable?: boolean;

  /** Loading state */
  loading?: boolean;

  /** Full width card */
  fullWidth?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Motion properties for premium cards */
  motionProps?: MotionProps;

  /** Header content */
  header?: ReactNode;

  /** Footer content */
  footer?: ReactNode;
}

// =============================================================================
// STYLE VARIANTS
// =============================================================================

const cardVariants = {
  base: [
    // Base styles
    'relative  bg-card-bg  -100 overflow-visible',
    'transition-all duration-normal ease-out',

    // Motion-safe animations
    'motion-safe:transition-all motion-safe:duration-normal',
  ],

  variants: {
    default: [
      'border border-charcoal-100 shadow-premium',
    ],

    elevated: [
      'shadow-premiumElevated',
      'hover:shadow-premiumElevatedHover',
    ],

    outlined: [
      'border-2 border-charcoal-200',
      'shadow-none',
    ],

    ghost: [
      'border-0 shadow-none bg-transparent',
    ],
  },

  sizes: {
    sm: [
      'rounded-md p-card-padding-sm', // 16px
    ],
    md: [
      'rounded-lg p-card-padding', // 24px
    ],
    lg: [
      'rounded-[12px] p-card-padding-lg', // 32px
    ],
  },

  interactions: {
    hoverable: [
      'hover:shadow-premiumHover hover:border-sage-200',
      'hover:bg-card-bg  ',
    ],

    clickable: [
      'cursor-pointer select-none',
      'active:scale-[0.98]',
      'focus:outline-none focus:ring-4 focus:ring-sage-500/20 focus:ring-offset-2',
    ],

    premium: [
      'transform-gpu', // Enable hardware acceleration
    ],
  },

  states: {
    loading: [
      'animate-pulse bg-navbar-bg/50',
      'pointer-events-none',
    ],
  },

  fullWidth: 'w-full',
} as const;

// =============================================================================
// LOADING SKELETON
// =============================================================================

const LoadingSkeleton = ({ size }: { size: 'sm' | 'md' | 'lg' }) => {
  const skeletonHeights = {
    sm: 'h-24',
    md: 'h-32',
    lg: 'h-40',
  };

  return (
    <div className={cn('animate-pulse space-y-3', skeletonHeights[size])}>
      <div className="h-4 bg-charcoal-200 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-charcoal-200 rounded"></div>
        <div className="h-3 bg-charcoal-200 rounded w-5/6"></div>
      </div>
    </div>
  );
};

// =============================================================================
// CARD COMPONENT
// =============================================================================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      hoverable = false,
      premium = false,
      clickable = false,
      loading = false,
      fullWidth = false,
      className,
      motionProps,
      header,
      footer,
      onClick,
      onKeyDown,
      tabIndex,
      role,
      ...props
    },
    ref
  ) => {
    // Make clickable cards keyboard accessible
    const isInteractive = clickable || onClick;
    const keyboardProps = isInteractive ? {
      tabIndex: tabIndex ?? 0,
      role: role ?? 'button',
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e as any);
        }
        onKeyDown?.(e);
      },
    } : {
      tabIndex,
      role,
      onKeyDown,
    };

    // Build card classes
    const cardClasses = cn(
      cardVariants.base,
      cardVariants.variants[variant],
      cardVariants.sizes[size],
      hoverable && cardVariants.interactions.hoverable,
      (clickable || onClick) && cardVariants.interactions.clickable,
      premium && cardVariants.interactions.premium,
      loading && cardVariants.states.loading,
      fullWidth && cardVariants.fullWidth,
      className
    );

    // Card content
    const cardContent = (
      <>
        {/* Header */}
        {header && (
          <div className="mb-4 border-b border-charcoal-100 pb-4">
            {header}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          {loading ? <LoadingSkeleton size={size} /> : children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-4 border-t border-charcoal-100 pt-4">
            {footer}
          </div>
        )}
      </>
    );

    // Premium motion card
    if (premium && !loading) {
      const defaultMotionProps: MotionProps = {
        whileHover: {
          scale: 1.02,
          y: -2,
          transition: { duration: 0.2, ease: 'easeOut' }
        },
        whileTap: clickable ? {
          scale: 0.98,
          transition: { duration: 0.1 }
        } : undefined,
      };

      return (
        <motion.div
          ref={ref}
          className={cardClasses}
          onClick={onClick}
          {...keyboardProps}
          {...defaultMotionProps}
          {...motionProps}
          {...(() => {
            const { onDrag, onDragStart, onDragEnd, ...restProps } = props as any;
            return restProps;
          })()}
        >
          {cardContent}
        </motion.div>
      );
    }

    // Standard card
    return (
      <div
        ref={ref}
        className={cardClasses}
        onClick={onClick}
        {...keyboardProps}
        {...props}
      >
        {cardContent}
      </div>
    );
  }
);

Card.displayName = 'Card';

// =============================================================================
// CARD SUB-COMPONENTS
// =============================================================================

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('font-primary text-heading-md font-semibold leading-none tracking-tight text-charcoal-600', className)}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('font-primary text-body-md text-charcoal-500 leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

// =============================================================================
// EXPORTS
// =============================================================================

export default Card;
