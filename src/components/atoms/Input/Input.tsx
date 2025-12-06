'use client';

import React from 'react';

export type InputVariant = 'default' | 'error' | 'success';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  inputSize?: InputSize;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<InputVariant, string> = {
  default: `border-light-gray/50 focus:border-sage focus:ring-sage/30`,
  error: `border-red-300 focus:border-red-500 focus:ring-red-500/20`,
  success: `border-green-300 focus:border-green-500 focus:ring-green-500/20`,
};

const sizeStyles: Record<InputSize, string> = {
  sm: `px-3 py-2 text-sm min-h-[40px]`,
  md: `px-4 py-3 text-base min-h-[48px]`,
  lg: `px-5 py-4 text-lg min-h-[56px]`,
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      inputSize = 'md',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = variant === 'error' || !!error;
    const displayVariant = hasError ? 'error' : variant;

    const baseStyles = `
      block w-full
      border rounded-[12px]
      bg-off-white
      transition-all duration-200
      focus:outline-none focus:ring-2
      disabled:bg-light-gray disabled:cursor-not-allowed disabled:opacity-60
      placeholder:text-charcoal/40
    `;

    const containerWidth = fullWidth ? 'w-full' : '';

    return (
      <div className={`${containerWidth}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-charcoal mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/50 flex-shrink-0">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`
              ${baseStyles}
              ${variantStyles[displayVariant]}
              ${sizeStyles[inputSize]}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/50 flex-shrink-0">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}

        {helperText && !error && (
          <p className="mt-1.5 text-sm text-charcoal/60">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
