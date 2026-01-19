"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Trophy } from "lucide-react";
import FallbackImage from "../FallbackImage/FallbackImage";

interface LeaderboardUser {
  rank: number;
  username: string;
  reviews: number;
  badge?: string;
  avatar: string;
  totalRating?: number;
  id?: string;
}

interface LeaderboardUserProps {
  user: LeaderboardUser;
  index: number;
  isMobile?: boolean;
}

function LeaderboardUser({ user, index, isMobile = false }: LeaderboardUserProps) {
  const getBadgeStyles = () => {
    switch (user.rank) {
      case 1:
        return "from-amber-400 to-amber-600 text-white";
      case 2:
        return "from-coral to-coral/80 text-white";
      case 3:
        return "from-charcoal/70 to-charcoal/50 text-white";
      default:
        return "from-charcoal/15 to-charcoal/10 text-charcoal/70";
    }
  };

  return (
    <Link href={user.id ? `/reviewer/${user.id}` : '#'} className="w-full">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="group bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer backdrop-blur-md hover:shadow-[0_12px_40px_rgb(0,0,0,0.18)] transition-shadow duration-300"
      >
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br ${getBadgeStyles()} rounded-full flex items-center justify-center font-urbanist text-caption sm:text-body-sm font-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex-shrink-0`}>
              {user.rank <= 3 ? <Trophy className="w-3 h-3 sm:w-4 sm:h-4" /> : user.rank}
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 relative rounded-lg overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex-shrink-0">
              <FallbackImage
                src={user.avatar}
                alt={user.username}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 48px, 56px"
                fallbackType="profile"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-urbanist text-body-sm sm:text-body font-600 text-charcoal truncate">@{user.username}</div>
              <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 flex items-center gap-1 flex-wrap">
                <span className="font-500">{user.reviews} reviews</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
            <div className="bg-gradient-to-br from-off-white via-off-white to-off-white/90 backdrop-blur-xl px-2 sm:px-3 py-1 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center gap-1">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-coral fill-coral" />
              <span className="font-urbanist text-caption sm:text-body-sm font-600 text-charcoal">{user.totalRating?.toFixed(1) || "4.8"}</span>
            </div>
            <span className="font-urbanist text-caption sm:text-body-sm text-charcoal/70 whitespace-nowrap">{user.reviews > 0 ? `${user.reviews} reviews` : "No reviews yet"}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default memo(LeaderboardUser);
