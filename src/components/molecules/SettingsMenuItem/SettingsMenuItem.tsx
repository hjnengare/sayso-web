'use client';

import React from 'react';
import { ChevronRight } from 'react-feather';

export type SettingsMenuItemVariant = 'default' | 'danger';

export interface SettingsMenuItemProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  onClick?: () => void;
  variant?: SettingsMenuItemVariant;
  showChevron?: boolean;
  className?: string;
}

const variantStyles: Record<SettingsMenuItemVariant, { icon: string; text: string; hover: string }> = {
  default: {
    icon: 'text-gray-500 group-hover:text-coral',
    text: 'text-charcoal group-hover:text-coral',
    hover: 'hover:bg-coral/5',
  },
  danger: {
    icon: 'text-coral',
    text: 'text-coral group-hover:text-coral/80',
    hover: 'hover:bg-coral/5',
  },
};

export const SettingsMenuItem: React.FC<SettingsMenuItemProps> = ({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  showChevron = true,
  className = '',
}) => {
  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 ${styles.hover} transition-colors duration-200 group rounded-[20px] ${className}`}
    >
      <div className="flex items-center space-x-3">
        <Icon className={`${styles.icon} w-5 h-5`} />
        <span className={`font-urbanist text-base font-500 ${styles.text} transition-colors duration-200`}>
          {label}
        </span>
      </div>
      {showChevron && (
        <ChevronRight
          className={variant === 'danger' ? 'text-coral' : 'text-gray-400 group-hover:text-coral transition-colors duration-200'}
          size={16}
        />
      )}
    </button>
  );
};
