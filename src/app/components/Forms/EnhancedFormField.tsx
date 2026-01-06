"use client";

import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

export interface EnhancedFormFieldProps {
  /** Field label */
  label: string;
  /** Field name for form identification */
  name: string;
  /** Field value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Error message to display */
  error?: string;
  /** Whether field has been touched/interacted with */
  touched?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Input type */
  type?: "text" | "email" | "password" | "tel" | "url" | "number";
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Helper text shown below field */
  helperText?: string;
  /** Custom input component */
  children?: React.ReactNode;
  /** Additional input props */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

/**
 * Enhanced FormField component with inline validation feedback
 * Provides clear, actionable error messages and accessibility features
 */
export default function EnhancedFormField({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched = false,
  disabled = false,
  type = "text",
  placeholder,
  required = false,
  helperText,
  children,
  inputProps = {},
}: EnhancedFormFieldProps) {
  const showError = touched && error;
  const showSuccess = touched && !error && value.length > 0;

  // Determine input classes based on state
  const getInputClasses = () => {
    const baseClasses = "w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2";
    
    if (showError) {
      return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/50`;
    }
    if (showSuccess) {
      return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-green-200 bg-green-50/30`;
    }
    return `${baseClasses} border-gray-300 focus:border-sage focus:ring-sage/20 bg-white`;
  };

  // If custom children provided, render with wrapper
  if (children) {
    return (
      <div className="w-full">
        <label 
          htmlFor={name} 
          className="block text-sm font-semibold text-charcoal mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
        
        <div className="relative">
          {children}
          {showSuccess && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          )}
          {showError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          )}
        </div>

        {/* Helper text */}
        {helperText && !showError && (
          <p className="mt-1.5 text-sm text-gray-600" id={`${name}-helper`}>
            {helperText}
          </p>
        )}

        {/* Error message */}
        {showError && (
          <p 
            className="mt-1.5 text-sm text-red-600 font-medium flex items-center gap-1.5"
            id={`${name}-error`}
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <label 
        htmlFor={name} 
        className="block text-sm font-semibold text-charcoal mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={showError ? "true" : "false"}
          aria-describedby={
            showError 
              ? `${name}-error` 
              : helperText 
              ? `${name}-helper` 
              : undefined
          }
          aria-required={required}
          className={getInputClasses()}
          {...inputProps}
        />
        
        {showSuccess && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
        )}
        {showError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Helper text */}
      {helperText && !showError && (
        <p className="mt-1.5 text-sm text-gray-600" id={`${name}-helper`}>
          {helperText}
        </p>
      )}

      {/* Error message */}
      {showError && (
        <p 
          className="mt-1.5 text-sm text-red-600 font-medium flex items-center gap-1.5"
          id={`${name}-error`}
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

