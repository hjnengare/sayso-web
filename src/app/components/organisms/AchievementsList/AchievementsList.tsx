'use client';

import React from 'react';
import { AchievementItem, AchievementItemProps } from '@/components/molecules/AchievementItem';

export interface AchievementsListProps {
  achievements: AchievementItemProps[];
  title?: string;
  className?: string;
}

export const AchievementsList: React.FC<AchievementsListProps> = ({
  achievements,
  title = 'Your Achievements',
  className = '',
}) => {
  return (
    <div className={`p-6 sm:p-8 bg-card-bg  rounded-[12px] shadow-sm mb-6 ${className}`}>
      <h2 className="text-sm font-bold text-charcoal mb-4" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{title}</h2>
      {achievements.length > 0 ? (
        <div className="space-y-3">
          {achievements.map((achievement, index) => (
            <AchievementItem key={index} {...achievement} />
          ))}
        </div>
      ) : (
        <p className="text-center text-charcoal/60 py-8 text-xs" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}>
          No achievements yet. Keep exploring!
        </p>
      )}
    </div>
  );
};
