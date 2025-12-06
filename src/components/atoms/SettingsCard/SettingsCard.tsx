'use client';

import React from 'react';

export interface SettingsCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  iconColor?: 'coral' | 'sage' | 'default';
  className?: string;
  children: React.ReactNode;
}

const iconColorClasses = {
  coral: 'from-coral/20 to-coral/10',
  sage: 'from-sage/20 to-sage/10',
  default: 'from-charcoal/20 to-charcoal/10',
};

const iconTextColors = {
  coral: 'text-coral',
  sage: 'text-sage',
  default: 'text-charcoal',
};

export const SettingsCard: React.FC<SettingsCardProps> = ({
  icon: Icon,
  title,
  iconColor = 'default',
  className = '',
  children,
}) => {
  return (
    <div className={`p-6 sm:p-8 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 mb-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${iconColorClasses[iconColor]}`}>
          <Icon className={`w-5 h-5 ${iconTextColors[iconColor]}`} />
        </div>
        <h2 className="text-lg font-600 text-charcoal">{title}</h2>
      </div>
      {children}
    </div>
  );
};

