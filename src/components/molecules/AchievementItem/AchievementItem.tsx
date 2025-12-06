'use client';

import React from 'react';
import { Award, CheckCircle } from 'react-feather';

export interface AchievementItemProps {
  name: string;
  description?: string | null;
  icon?: string;
  earnedAt?: string;
  className?: string;
}

export const AchievementItem: React.FC<AchievementItemProps> = ({
  name,
  description,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center space-x-3 p-3 transition-all duration-200 bg-sage/10 border border-sage/20 rounded-[12px] ${className}`}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-sage/20">
        <Award className="w-5 h-5 text-sage" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-base font-600 text-charcoal" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{name}</span>
        {description && (
          <p className="text-sm text-charcoal/60 mt-1" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}>{description}</p>
        )}
      </div>
      <CheckCircle className="text-sage w-5 h-5 flex-shrink-0" />
    </div>
  );
};
