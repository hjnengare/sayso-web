"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';

export interface BadgePillData {
  id: string;
  name: string;
  icon_path: string;
}

interface BadgePillProps {
  badge: BadgePillData;
  size?: 'sm' | 'md';
}

export default function BadgePill({ badge, size = 'sm' }: BadgePillProps) {
  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
    },
    md: {
      container: 'px-3 py-1 text-sm',
      icon: 'w-4 h-4',
    },
  };

  return (
    <motion.div
      className={`
        inline-flex items-center gap-1.5 rounded-full
        bg-gradient-to-r from-sage/10 to-coral/10
        border border-sage/30
        ${sizeClasses[size].container}
      `}
      whileHover={{ scale: 1.05 }}
      title={badge.name}
    >
      <div className={`relative ${sizeClasses[size].icon} flex-shrink-0`}>
        <Image
          src={badge.icon_path}
          alt={badge.name}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
      <span className="font-urbanist font-600 text-sage whitespace-nowrap">
        {badge.name}
      </span>
    </motion.div>
  );
}
