'use client';

import React from 'react';
import { SettingsMenuItem, SettingsMenuItemProps } from '@/components/molecules/SettingsMenuItem';

export interface SettingsMenuProps {
  menuItems: SettingsMenuItemProps[];
  title?: string;
  className?: string;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  menuItems,
  title,
  className = '',
}) => {
  return (
    <div className={`p-6 sm:p-8 bg-card-bg border border-white/50 rounded-[20px] shadow-sm mb-12 ${className}`}>
      {title && (
        <h2 className="font-urbanist text-sm font-bold text-charcoal mb-4">{title}</h2>
      )}
      <div className="space-y-2">
        {menuItems.map((item, index) => (
          <SettingsMenuItem key={index} {...item} />
        ))}
      </div>
    </div>
  );
};
