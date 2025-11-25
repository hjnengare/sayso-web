'use client';

import React from 'react';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';
export type SkeletonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  size?: SkeletonSize;
  width?: string | number;
  height?: string | number;
  className?: string;
}

const sizeStyles: Record<SkeletonSize, { height: string; width: string }> = {
  sm: { height: 'h-4', width: 'w-20' },
  md: { height: 'h-6', width: 'w-32' },
  lg: { height: 'h-8', width: 'w-48' },
  xl: { height: 'h-12', width: 'w-64' },
};

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-lg',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  size = 'md',
  width,
  height,
  className = '',
}) => {
  const { height: defaultHeight, width: defaultWidth } = sizeStyles[size];

  const inlineStyles: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      className={`
        animate-pulse bg-navbar-bg/10
        ${!width ? defaultWidth : ''}
        ${!height ? defaultHeight : ''}
        ${variantStyles[variant]}
        ${className}
      `}
      style={inlineStyles}
      aria-label="Loading..."
      role="status"
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '60%' : '100%'}
        height={16}
      />
    ))}
  </div>
);
