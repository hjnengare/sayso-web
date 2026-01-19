'use client';

import React from 'react';
import Image from 'next/image';
import { Award, CheckCircle } from 'lucide-react';

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
  icon,
  earnedAt,
  className = '',
}) => {
  // Check if icon is a PNG path (from badge system)
  const isPngIcon = icon && icon.startsWith('/badges/');

  return (
    <div
      className={`flex items-center space-x-3 p-3 transition-all duration-200 bg-sage/10 border border-sage/20 rounded-[20px] ${className}`}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-sage/20 overflow-hidden flex-shrink-0">
        {isPngIcon ? (
          <Image
            src={icon}
            alt={name}
            width={28}
            height={28}
            className="object-contain"
            unoptimized
          />
        ) : (
          <Award className="w-5 h-5 text-sage" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-base font-600 text-charcoal" style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{name}</span>
        {description && (
          <p className="text-sm text-charcoal/60 mt-0.5" style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>{description}</p>
        )}
        {earnedAt && (
          <p className="text-xs text-sage mt-0.5" style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
            Earned {new Date(earnedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      <CheckCircle className="text-sage w-5 h-5 flex-shrink-0" />
    </div>
  );
};
