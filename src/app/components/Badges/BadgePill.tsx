"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { getBadgeMapping, getBadgeLucideIcon } from "../../lib/badgeMappings";
import { Award } from "lucide-react";

export interface BadgePillData {
  id: string;
  name: string;
  icon_path?: string;
}

interface BadgePillProps {
  badge: BadgePillData;
  size?: "sm" | "md";
  /**
   * Display mode:
   * - "png": Show PNG image (for profiles)
   * - "icon": Show Lucide icon (for review cards - more compact)
   */
  mode?: "png" | "icon";
}

export default function BadgePill({
  badge,
  size = "sm",
  mode = "icon",
}: BadgePillProps) {
  const sizeClasses = {
    sm: {
      container: "px-2 py-0.5 text-xs",
      icon: "w-3 h-3",
      pngSize: 12,
    },
    md: {
      container: "px-3 py-1 text-sm",
      icon: "w-4 h-4",
      pngSize: 16,
    },
  };

  // Get the mapping for this badge
  const mapping = getBadgeMapping(badge.id);
  const LucideIcon = mapping?.lucideIcon || getBadgeLucideIcon(badge.id) || Award;
  const pngPath = mapping?.pngPath || badge.icon_path || "/badges/012-expertise.png";

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
      {mode === "png" ? (
        <div
          className={`relative ${sizeClasses[size].icon} flex-shrink-0`}
        >
          <Image
            src={pngPath}
            alt={badge.name}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      ) : (
        <LucideIcon
          className={`${sizeClasses[size].icon} flex-shrink-0 text-sage`}
        />
      )}
      <span className="font-urbanist font-600 text-sage whitespace-nowrap">
        {badge.name}
      </span>
    </motion.div>
  );
}
