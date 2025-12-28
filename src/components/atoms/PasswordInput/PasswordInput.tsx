'use client';

import React from 'react';
import { Eye, EyeOff } from 'react-feather';

export interface PasswordInputProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  showPassword: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  className?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  value,
  onChange,
  showPassword,
  onToggleShow,
  placeholder,
  className = '',
}) => {
  return (
    <div className={className}>
      <label className="block text-sm font-600 text-charcoal mb-2">{label}</label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[20px] border-2 border-charcoal/20 bg-white/80 backdrop-blur-sm px-4 py-3 pr-10 text-sm text-charcoal placeholder:text-charcoal/50 font-urbanist focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 hover:border-charcoal/30 transition-all duration-200"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/50 hover:text-charcoal transition-colors"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

