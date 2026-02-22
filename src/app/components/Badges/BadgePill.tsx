"use client";

import Image from "next/image";
import { m } from "framer-motion";
import { getBadgeMapping, getBadgeLucideIcon } from "../../lib/badgeMappings";
import { Award } from "lucide-react";

export interface BadgePillData {
  id: string;
  name: string;
  icon_path?: string;
  badge_group?: string;
}

/** Group-based color schemes for visual variety */
const GROUP_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  explorer:   { bg: "from-sky-400/25 via-blue-400/15 to-cyan-300/20",        border: "border-sky-300/50",    text: "text-sky-700",     glow: "shadow-sky-300/30"    },
  specialist: { bg: "from-violet-400/25 via-purple-400/15 to-fuchsia-300/20", border: "border-violet-300/50", text: "text-violet-700",  glow: "shadow-violet-300/30" },
  milestone:  { bg: "from-amber-400/30 via-yellow-300/20 to-orange-300/20",   border: "border-amber-300/55",  text: "text-amber-700",   glow: "shadow-amber-300/30"  },
  community:  { bg: "from-emerald-400/25 via-teal-300/15 to-green-300/20",    border: "border-emerald-300/50", text: "text-emerald-700", glow: "shadow-emerald-300/30" },
};

const DEFAULT_STYLE = { bg: "from-coral/20 via-sage/12 to-coral/10", border: "border-coral/30", text: "text-coral", glow: "shadow-coral/20" };

interface BadgePillProps {
  badge: BadgePillData;
  size?: "sm" | "md";
  /**
   * Display mode:
   * - "png": Show PNG image (always)
   * - "icon": Show Lucide icon (compact fallback)
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
      container: "px-1.5 py-[3px] text-[10px] gap-1",
      iconWrap: "w-4 h-4",
      pngSize: 16,
    },
    md: {
      container: "px-2.5 py-1 text-xs gap-1.5",
      iconWrap: "w-5 h-5",
      pngSize: 20,
    },
  };

  // Get the mapping for this badge
  const mapping = getBadgeMapping(badge.id);
  const LucideIcon = mapping?.lucideIcon || getBadgeLucideIcon(badge.id) || Award;
  const pngPath = mapping?.pngPath || badge.icon_path || "/badges/012-expertise.png";
  const group = mapping?.badgeGroup || badge.badge_group || "";
  const style = GROUP_STYLES[group] || DEFAULT_STYLE;

  return (
    <m.div
      className={`
        inline-flex items-center rounded-full
        bg-gradient-to-r ${style.bg}
        ${style.border} border
        shadow-sm ${style.glow}
        ${sizeClasses[size].container}
        backdrop-blur-sm
        cursor-default select-none
      `}
      whileHover={{ scale: 1.08, y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      title={badge.name}
    >
      <div className={`relative ${sizeClasses[size].iconWrap} flex-shrink-0`}>
        <Image
          src={pngPath}
          alt={badge.name}
          fill
          className="object-contain drop-shadow-sm"
          unoptimized
        />
      </div>
      <span className={`font-urbanist font-700 ${style.text} whitespace-nowrap leading-tight`}>
        {badge.name}
      </span>
    </m.div>
  );
}
