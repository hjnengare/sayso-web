/**
 * BUTTON COMPONENT - BLABBR DESIGN SYSTEM
 *
 * Standardized button component with full accessibility support
 * Supports all use cases found in the codebase audit
 */

import React, { forwardRef, ReactNode, cloneElement, isValidElement } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '../utils/cn';
import { InlineLoader } from '@/app/components/Loader';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  /** Button content */
  children: ReactNode;

  /** Button visual variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

  /** Button size */
  size?: 'sm' | 'md' | 'lg';

  /** Full width button */
  fullWidth?: boolean;

  /** Loading state */
  loading?: boolean;

  /** Loading text override */
  loadingText?: string;

  /** Icon before text */
  iconBefore?: ReactNode;

  /** Icon after text */
  iconAfter?: ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Enable premium hover effects */
  premium?: boolean;

  /** Motion properties */
  motionProps?: MotionProps;

  /** Render as child element instead of button */
  asChild?: boolean;
}

// =============================================================================
// STYLE VARIANTS
// =============================================================================

const buttonVariants = {
  base: [
    // Base styles
    'inline-flex items-center justify-center gap-2',
    'font-primary font-semibold text-center',
    'transition-all duration-normal ease-out',
    'focus:outline-none focus:ring-4 focus:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'relative overflow-hidden',

    // Prevent iOS zoom on focus
    'touch-manipulation',

    // Ensure minimum touch target (44px)
    'min-h-[44px]',

    // Motion-safe animations
    'motion-safe:transition-all motion-safe:duration-normal',
  ],

  variants: {
    primary: [
      'bg-gradient-to-r from-sage-500 to-sage-600',
      'text-white shadow-md',
      'hover:from-sage-600 hover:to-sage-700 hover:shadow-sage-md',
      'active:from-sage-700 active:to-sage-800',
      'focus:ring-sage-500/30',
      // Premium hover effect
      'group',
      'before:absolute before:inset-0 before:bg-gradient-to-r before:from-coral-500 before:to-coral-600',
      'before:opacity-0 before:transition-opacity before:duration-300',
      'hover:before:opacity-100',
    ],

    secondary: [
      'bg-coral-500 text-white shadow-md',
      'hover:bg-coral-600 hover:shadow-coral-md',
      'active:bg-coral-700',
      'focus:ring-coral-500/30',
    ],

    outline: [
      'border-2 border-sage-500 text-sage-500 bg-transparent shadow-md',
      'hover:bg-sage-500 hover:text-white hover:shadow-sage-sm',
      'active:bg-sage-600 active:border-sage-600',
      'focus:ring-sage-500/30',
    ],

    ghost: [
      'text-charcoal-500 bg-transparent shadow-md',
      'hover:bg-sage-50 hover:text-sage-600',
      'active:bg-sage-100',
      'focus:ring-sage-500/20',
    ],

    destructive: [
      'bg-error-500 text-white shadow-md',
      'hover:bg-error-600 hover:shadow-lg',
      'active:bg-error-700',
      'focus:ring-error-500/30',
    ],
  },

  sizes: {
    sm: [
      'h-9 px-4 text-body-sm',
      'rounded-md',
    ],
    md: [
      'h-11 px-6 text-body-md',
      'rounded-md',
    ],
    lg: [
      'h-12 px-8 text-body-lg',
      'rounded-lg',
    ],
  },

  fullWidth: 'w-full',

  loading: [
    'cursor-wait',
    'pointer-events-none',
  ],
} as const;

// =============================================================================
// LOADING SPINNER COMPONENT
// =============================================================================

const LoadingSpinner = ({ size }: { size: 'sm' | 'md' | 'lg' }) => {
  // Map button sizes to loader sizes
  const loaderSize = size === 'sm' ? 'xs' : size === 'lg' ? 'sm' : 'xs';
  
  return <InlineLoader size={loaderSize} color="current" />;
};

// =============================================================================
// BUTTON COMPONENT
// =============================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      loadingText,
      iconBefore,
      iconAfter,
      className,
      premium = false,
      motionProps,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Determine button classes
    const buttonClasses = cn(
      buttonVariants.base,
      buttonVariants.variants[variant],
      buttonVariants.sizes[size],
      fullWidth && buttonVariants.fullWidth,
      loading && buttonVariants.loading,
      className
    );

    // Button content for normal buttons
    const buttonContent = (
      <>
        {/* Loading state */}
        {loading && <LoadingSpinner size={size} />}

        {/* Icon before */}
        {!loading && iconBefore && (
          <span className="flex-shrink-0" aria-hidden="true">
            {iconBefore}
          </span>
        )}

        {/* Button text */}
        <span className="relative z-10 whitespace-nowrap">
          {loading ? loadingText || 'Loading...' : children}
        </span>

        {/* Icon after */}
        {!loading && iconAfter && (
          <span className="flex-shrink-0" aria-hidden="true">
            {iconAfter}
          </span>
        )}
      </>
    );

    // Handle asChild case - render children with button props
    if (asChild) {
      if (isValidElement(children)) {
        // Clone the child element and merge props
        return cloneElement(children, {
          className: cn(buttonClasses, (children as any).props?.className),
          ref,
          ...props,
          ...(children as any).props,
        });
      } else {
        console.warn('Button: asChild prop requires a single valid React element as children');
        return null;
      }
    }

    // Premium motion effects
    if (premium && !isDisabled) {
      return (
        <motion.button
          ref={ref}
          className={buttonClasses}
          disabled={isDisabled}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          {...motionProps}
          {...(() => {
            const { onDrag, onDragStart, onDragEnd, ...restProps } = props as any;
            return restProps;
          })()}
        >
          {buttonContent}
        </motion.button>
      );
    }

    // Standard button
    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';

// =============================================================================
// EXPORTS
// =============================================================================

export default Button;
