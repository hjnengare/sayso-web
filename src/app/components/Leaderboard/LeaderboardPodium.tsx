"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import FallbackImage from "../FallbackImage/FallbackImage";

interface LeaderboardUser {
  rank: number;
  username: string;
  reviews: number;
  badge?: string;
  avatar: string;
}

interface LeaderboardPodiumProps {
  topReviewers: LeaderboardUser[];
}

function LeaderboardPodium({ topReviewers }: LeaderboardPodiumProps) {
  // Only render podium if we have at least 3 reviewers
  if (!topReviewers || topReviewers.length < 3) {
    return null;
  }

  return (
    <div className="flex flex-row justify-center items-end gap-1.5 sm:gap-3 md:gap-4 lg:gap-6 mb-6 sm:mb-8 md:mb-12 pt-6 sm:pt-8 md:pt-10 px-2 sm:px-4 md:px-6 max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">
      {/* 2nd Place */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-center group cursor-pointer flex-1 w-full max-w-[100px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[200px] order-1"
      >
        <div className="relative mb-1.5 sm:mb-2 md:mb-3">
          <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 relative rounded-full overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.2)] mx-auto">
            <FallbackImage
              src={topReviewers[1].avatar}
              alt={topReviewers[1].username}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 48px, (max-width: 768px) 64px, (max-width: 1024px) 80px, 96px"
              fallbackType="profile"
            />
          </div>
          <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 md:-top-2 md:-right-2 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-slate-100 to-slate-300 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-[1.5px] sm:border-2 border-white">
            <span className="text-[10px] sm:text-body-sm md:text-body font-bold text-charcoal">2</span>
          </div>
        </div>
        <div className="font-urbanist text-xs sm:text-body-sm md:text-body font-700 text-charcoal mb-1 truncate px-1 sm:px-2 max-w-full overflow-hidden min-h-[1.25rem] sm:min-h-[1.5rem] md:min-h-[1.75rem]">@{topReviewers[1].username}</div>
        <div className="font-urbanist text-[10px] sm:text-caption md:text-body-sm text-charcoal/60 mb-1.5 sm:mb-2 flex items-center justify-center gap-1">
          <span className="font-700 text-charcoal">{topReviewers[1].reviews}</span> reviews
        </div>
        {/* Professional Podium Block */}
        <div className="relative mt-auto">
          <div className="podium-metal podium-metal--silver rounded-t-xl h-12 sm:h-20 md:h-28 lg:h-32 w-full shadow-[0_10px_34px_rgba(0,0,0,0.16)]" />
        </div>
      </motion.div>

      {/* 1st Place */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-center group cursor-pointer flex-1 w-full max-w-[120px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[240px] order-2"
      >
        <div className="relative mb-1.5 sm:mb-2 md:mb-3">
          <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 relative rounded-full overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.25)] mx-auto">
            <FallbackImage
              src={topReviewers[0].avatar}
              alt={topReviewers[0].username}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 56px, (max-width: 768px) 80px, (max-width: 1024px) 96px, 128px"
              fallbackType="profile"
            />
          </div>
          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 md:-top-3 md:-right-3 w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.3)] border-[1.5px] sm:border-2 border-white">
            <Trophy className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
          </div>
        </div>
        <div className="font-urbanist text-sm sm:text-body md:text-h3 font-700 text-charcoal mb-1 truncate px-1 sm:px-2 max-w-full overflow-hidden min-h-[1.5rem] sm:min-h-[1.75rem] md:min-h-[2rem]">@{topReviewers[0].username}</div>
        <div className="font-urbanist text-[10px] sm:text-caption md:text-body-sm text-charcoal/60 mb-1.5 sm:mb-2 flex items-center justify-center gap-1">
          <span className="font-700 text-charcoal">{topReviewers[0].reviews}</span> reviews
        </div>
        {/* Professional Podium Block */}
        <div className="relative mt-auto">
          <div className="podium-metal podium-metal--gold rounded-t-xl h-16 sm:h-24 md:h-36 lg:h-48 w-full shadow-[0_14px_44px_rgba(0,0,0,0.2)]" />
        </div>
      </motion.div>

      {/* 3rd Place */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="text-center group cursor-pointer flex-1 w-full max-w-[100px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[200px] order-3"
      >
        <div className="relative mb-1.5 sm:mb-2 md:mb-3">
          <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 relative rounded-full overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.2)] mx-auto">
            <FallbackImage
              src={topReviewers[2].avatar}
              alt={topReviewers[2].username}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 48px, (max-width: 768px) 64px, (max-width: 1024px) 80px, 96px"
              fallbackType="profile"
            />
          </div>
          <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 md:-top-2 md:-right-2 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#d2a07a] to-[#8b5a3c] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-[1.5px] sm:border-2 border-white">
            <span className="text-[10px] sm:text-body-sm md:text-body font-bold text-white">3</span>
          </div>
        </div>
        <div className="font-urbanist text-xs sm:text-body-sm md:text-body font-700 text-charcoal mb-1 truncate px-1 sm:px-2 max-w-full overflow-hidden min-h-[1.25rem] sm:min-h-[1.5rem] md:min-h-[1.75rem]">@{topReviewers[2].username}</div>
        <div className="font-urbanist text-[10px] sm:text-caption md:text-body-sm text-charcoal/60 mb-1.5 sm:mb-2 flex items-center justify-center gap-1">
          <span className="font-700 text-charcoal">{topReviewers[2].reviews}</span> reviews
        </div>
        {/* Professional Podium Block */}
        <div className="relative mt-auto">
          <div className="podium-metal podium-metal--bronze rounded-t-xl h-10 sm:h-16 md:h-24 lg:h-28 w-full shadow-[0_10px_34px_rgba(0,0,0,0.16)]" />
        </div>
      </motion.div>
    </div>
  );
}

export default memo(LeaderboardPodium);
