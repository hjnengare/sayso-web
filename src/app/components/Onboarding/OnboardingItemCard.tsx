"use client";

import { ReactNode } from "react";

interface OnboardingItemCardProps {
  children: ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  animated?: boolean;
  shaking?: boolean;
  icon?: ReactNode;
  label?: string;
  description?: string;
  className?: string;
}

export default function OnboardingItemCard({
  children,
  isSelected = false,
  onClick,
  disabled = false,
  animated = true,
  shaking = false,
  icon,
  label,
  description,
  className = "",
}: OnboardingItemCardProps) {
  return (
    <div
      onClick={() => !disabled && onClick?.()}
      className={`
        relative group cursor-pointer
        transition-all duration-300 ease-out
        ${shaking ? "animate-shake" : ""}
        ${animated ? "hover:scale-105" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      <div
        className={`
          p-4 rounded-[16px] border-2 transition-all duration-300
          flex flex-col items-center justify-center gap-2
          ${isSelected
            ? "border-sage bg-sage/10 ring-2 ring-sage/20 shadow-lg"
            : "border-slate-200 bg-white hover:border-sage/50 hover:bg-sage/5"
          }
          ${disabled ? "opacity-50" : ""}
        `}
      >
        {icon && (
          <div className={`
            transition-all duration-300
            ${isSelected ? "scale-110 text-sage" : "text-slate-600 group-hover:text-sage/60"}
          `}>
            {icon}
          </div>
        )}

        {label && (
          <p className={`
            font-semibold text-center text-sm transition-colors duration-300
            ${isSelected ? "text-sage" : "text-slate-700"}
          `}>
            {label}
          </p>
        )}

        {description && (
          <p className="text-xs text-slate-500 text-center line-clamp-2">
            {description}
          </p>
        )}

        {!icon && !label && children}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-sage rounded-full flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
