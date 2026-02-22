"use client";

import { memo, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import LeaderboardUser from "./LeaderboardUser";

interface LeaderboardUser {
  rank: number;
  username: string;
  reviews: number;
  badge?: string;
  avatar: string;
  totalRating?: number;
}

interface LeaderboardListProps {
  users: LeaderboardUser[];
  showFullLeaderboard: boolean;
  onToggleFullLeaderboard: () => void;
}

function LeaderboardList({ 
  users, 
  showFullLeaderboard, 
  onToggleFullLeaderboard 
}: LeaderboardListProps) {
  // Memoize the user arrays to prevent unnecessary recalculations
  const visibleUsers = useMemo(() => 
    showFullLeaderboard ? users : users.slice(0, 5), 
    [users, showFullLeaderboard]
  );
  
  const hiddenUsers = useMemo(() => 
    users.slice(5), 
    [users]
  );

  return (
    <>
      {/* Mobile: Vertical stacked list */}
      <div className="md:hidden space-y-2 sm:space-y-3">
        {visibleUsers.map((user, index) => (
          <LeaderboardUser 
            key={user.rank} 
            user={user} 
            index={index}
            isMobile={true}
          />
        ))}

        <AnimatePresence>
          {showFullLeaderboard && hiddenUsers.map((user, index) => (
            <m.div
              key={user.rank}
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="mt-3 sm:mt-4"
            >
              <LeaderboardUser 
                user={user} 
                index={index + 5}
                isMobile={true}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Desktop: Vertical list */}
      <div className="hidden md:block space-y-2 sm:space-y-3">
        {visibleUsers.map((user, index) => (
          <LeaderboardUser 
            key={user.rank} 
            user={user} 
            index={index}
            isMobile={false}
          />
        ))}

        <AnimatePresence>
          {showFullLeaderboard && hiddenUsers.map((user, index) => (
            <m.div
              key={user.rank}
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="mt-3 sm:mt-4"
            >
              <LeaderboardUser 
                user={user} 
                index={index + 5}
                isMobile={false}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="text-center mt-6 sm:mt-8">
        <button
          onClick={onToggleFullLeaderboard}
          className="font-urbanist text-body-sm sm:text-body font-700 text-white transition-all duration-300 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-gradient-to-br from-sage to-sage/90 rounded-full flex items-center gap-1.5 sm:gap-2 mx-auto shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-sage  hover:shadow-[0_10px_40px_rgba(0,0,0,0.25)] hover:scale-[1.02] active:scale-[0.98]"
        >
          {showFullLeaderboard ? (
            <>
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Show Less</span>
            </>
          ) : (
            <>
              <span>View Full Leaderboard</span>
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </>
          )}
        </button>
      </div>
    </>
  );
}

export default memo(LeaderboardList);
