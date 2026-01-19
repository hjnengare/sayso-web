"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { getBadgeMapping, getBadgePngPath } from "../../lib/badgeMappings";
import { Lock } from "lucide-react";

export interface Badge {
  id: string;
  name: string;
  description: string;
  badge_group: "explorer" | "specialist" | "milestone" | "community";
  category_key?: string | null;
  icon_path?: string;
  earned: boolean;
  awarded_at?: string | null;
}

interface BadgeCardProps {
  badge: Badge;
  onClick?: () => void;
}

export default function BadgeCard({ badge, onClick }: BadgeCardProps) {
  const isLocked = !badge.earned;

  // Get the correct PNG path from mappings, fallback to icon_path if provided
  const mapping = getBadgeMapping(badge.id);
  const pngPath = mapping?.pngPath || badge.icon_path || getBadgePngPath(badge.id);

  return (
    <motion.div
      className={`
        relative flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer
        ${
          isLocked
            ? "bg-charcoal/5 border-charcoal/10"
            : "bg-gradient-to-br from-sage/5 to-coral/5 border-sage/30 shadow-md"
        }
        hover:scale-105 active:scale-95
      `}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Badge Icon */}
      <div className="relative w-16 h-16 mb-3">
        <Image
          src={pngPath}
          alt={badge.name}
          fill
          className={`
            object-contain rounded-lg
            ${isLocked ? "grayscale opacity-40" : "filter-none"}
          `}
          unoptimized
        />

        {/* Lock overlay for locked badges */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-6 h-6 text-charcoal/60" />
          </div>
        )}

        {/* Shine effect for earned badges */}
        {!isLocked && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-lg"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
        )}
      </div>

      {/* Badge Name */}
      <h3
        className={`
          font-urbanist font-700 text-sm text-center mb-1
          ${isLocked ? "text-charcoal/70" : "text-charcoal"}
        `}
      >
        {badge.name}
      </h3>

      {/* Badge Description */}
      <p
        className={`
          font-urbanist text-xs text-center line-clamp-2
          ${isLocked ? "text-charcoal/60" : "text-charcoal/70"}
        `}
      >
        {badge.description}
      </p>

      {/* Awarded Date (if earned) */}
      {!isLocked && badge.awarded_at && (
        <p className="mt-2 text-xs text-sage font-600">
          Earned {new Date(badge.awarded_at).toLocaleDateString()}
        </p>
      )}
    </motion.div>
  );
}
