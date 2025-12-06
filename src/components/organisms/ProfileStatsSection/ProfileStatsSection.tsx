'use client';

import React from 'react';
import { StatsGrid, Stat } from '@/components/molecules/StatsGrid';

export interface ProfileStatsSectionProps {
  stats: Stat[];
  title?: string;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const ProfileStatsSection: React.FC<ProfileStatsSectionProps> = ({
  stats,
  title = 'Stats Overview',
  columns = 3,
  className = '',
}) => {
  return (
    <div className={`p-6 sm:p-8 bg-card-bg border border-white/50 rounded-[12px] shadow-sm mb-6 ${className}`}>
      <h2 className="text-sm font-bold text-charcoal mb-4" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{title}</h2>
      <StatsGrid stats={stats} columns={columns} />
    </div>
  );
};
