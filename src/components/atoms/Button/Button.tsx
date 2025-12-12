'use client';

import React from 'react';
import { colors } from '@/styles/shared/colors';
import { typography } from '@/styles/shared/typography';
import { effects } from '@/styles/shared/effects';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `bg-sage hover:bg-sage-dark text-white shadow-md hover:shadow-lg active:scale-[0.98]`,
  secondary: `bg-charcoal hover:bg-charcoal/90 text-white shadow-md hover:shadow-lg active:scale-[0.98]`,
  outline: `border-2 border-sage text-sage hover:bg-sage hover:text-white shadow-md active:scale-[0.98]`,
  ghost: `text-sage hover:bg-sage/10 shadow-md active:scale-[0.98]`,
  danger: `bg-coral hover:bg-coral-dark text-white shadow-md hover:shadow-lg active:scale-[0.98]`,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: `px-4 py-2 text-sm min-h-[40px]`,
  md: `px-6 py-3 text-base min-h-[48px]`,
  lg: `px-8 py-4 text-lg min-h-[56px]`,
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-full
      transition-all duration-300
      focus:outline-none focus:ring-2 focus:ring-sage/30 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    `;

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${widthStyles}
          ${className}
        `}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
