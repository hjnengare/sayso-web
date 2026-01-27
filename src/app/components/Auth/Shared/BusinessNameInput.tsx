"use client";

import { Building2, AlertCircle, CheckCircle } from "lucide-react";

interface BusinessNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  touched: boolean;
  disabled?: boolean;
}

export function BusinessNameInput({
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled = false
}: BusinessNameInputProps) {
  const hasError = touched && !!error;
  const isValid = touched && value && !error;

  return (
    <div>
      <label
        className="block text-sm font-semibold text-white mb-2"
        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
      >
        Business Name
      </label>
      <div className="relative group">
        <div
          className={`absolute left-4 sm:left-5 top-1/2 transform -translate-y-1/2 transition-colors duration-300 z-10 ${
            hasError
              ? "text-navbar-bg"
              : isValid
                ? "text-sage"
                : "text-charcoal/60 group-focus-within:text-sage"
          }`}
        >
          {hasError ? (
            <AlertCircle className="w-5 h-5" />
          ) : isValid ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Building2 className="w-5 h-5" />
          )}
        </div>
        <input
          type="text"
          placeholder="Your business name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
          className={`w-full bg-white/95 backdrop-blur-sm border pl-12 sm:pl-14 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
            hasError
              ? "border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20"
              : isValid
                ? "border-sage/40 focus:border-navbar-bg focus:ring-navbar-bg/20"
                : "border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg"
          }`}
          disabled={disabled}
        />
      </div>
      {hasError && (
        <p
          className="text-sm sm:text-xs text-navbar-bg flex items-center gap-1 mt-1"
          role="alert"
          style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      {isValid && (
        <p
          className="text-sm sm:text-xs text-navbar-bg flex items-center gap-1 mt-1"
          role="status"
          style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
        >
          <CheckCircle className="w-3 h-3" />
          Business name looks good!
        </p>
      )}
    </div>
  );
}
