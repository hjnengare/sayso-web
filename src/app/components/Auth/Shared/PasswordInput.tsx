"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "react-feather";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  placeholder?: string;
  showStrength?: boolean;
  strength?: {
    score: number;
    feedback: string;
    checks: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      number: boolean;
    };
  };
  touched: boolean;
  error?: string;
}

export function PasswordInput({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = "Create a strong password",
  showStrength = false,
  strength,
  touched,
  error
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const hasError = touched && !!error;
  const isStrong = showStrength && strength && strength.score >= 3 && touched && !hasError;
  const isWeak = showStrength && strength && strength.score > 0 && strength.score < 3 && !hasError;

  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
        Password
      </label>
      <div className="relative group">
        <div className={`absolute left-4 sm:left-5 top-1/2 transform -translate-y-1/2 transition-colors duration-300 z-10 ${
          hasError ? 'text-navbar-bg' :
          isStrong ? 'text-sage' :
          isWeak ? 'text-orange-500' :
          'text-charcoal/40 group-focus-within:text-sage'
        }`}>
          {hasError ? <AlertCircle className="w-5 h-5" /> :
            isStrong ? <CheckCircle className="w-5 h-5" /> :
            isWeak ? <AlertCircle className="w-5 h-5" /> :
            <Lock className="w-5 h-5" />}
        </div>
        <input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
          className={`w-full bg-white/95 backdrop-blur-sm border pl-12 sm:pl-14 pr-12 sm:pr-16 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
            hasError ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20' :
            isStrong ? 'border-sage/40 focus:border-navbar-bg focus:ring-navbar-bg/20' :
            isWeak ? 'border-orange-300 focus:border-navbar-bg focus:ring-navbar-bg/20' :
            'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
          }`}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 sm:right-5 top-1/2 transform -translate-y-1/2 text-charcoal/40 hover:text-charcoal transition-colors duration-300 p-1 z-10 rounded-full"
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Error message */}
      {hasError && error && (
        <p className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
          {error}
        </p>
      )}
      {/* Password strength indicator */}
      {showStrength && value.length > 0 && strength && !hasError && (
        <div className="h-5 mt-1 flex items-center gap-2">
          <div className="flex-1 flex gap-1" role="progressbar" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={4}>
            {[1, 2, 3, 4].map((level) => {
              const barColors = ['bg-error-500', 'bg-yellow-400', 'bg-yellow-500', 'bg-navbar-bg'] as const;
              const activeColor = barColors[Math.min(level - 1, barColors.length - 1)];
              return (
                <div
                  key={level}
                  className={`h-1 flex-1 transition-all duration-300 ${level <= strength.score ? activeColor : 'bg-gray-200'}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
