"use client";

import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import BusinessOfMonthPodium from "./BusinessOfMonthPodium";
import BusinessLeaderboardItem from "./BusinessLeaderboardItem";
import { BusinessOfTheMonth } from "../../types/community";

interface Interest {
  id: string;
  name: string;
}

const INTEREST_TITLES: { [key: string]: string } = {
  'food-drink': 'Food & Drink',
  'beauty-wellness': 'Beauty & Wellness',
  'professional-services': 'Professional Services',
  travel: 'Travel',
  'outdoors-adventure': 'Outdoors & Adventure',
  'experiences-entertainment': 'Entertainment & Experiences',
  'arts-culture': 'Arts & Culture',
  'family-pets': 'Family & Pets',
  'shopping-lifestyle': 'Shopping & Lifestyle',
  'miscellaneous': 'Miscellaneous',
};

interface BusinessOfMonthLeaderboardProps {
  businesses: BusinessOfTheMonth[];
  showFullLeaderboard: boolean;
  onToggleFullLeaderboard: () => void;
}

function BusinessOfMonthLeaderboard({
  businesses,
  showFullLeaderboard,
  onToggleFullLeaderboard,
}: BusinessOfMonthLeaderboardProps) {
  const [selectedInterest, setSelectedInterest] = useState<string>("all");
  
  // Use static interests to improve performance - no API call needed
  const [interests] = useState<Interest[]>([
    { id: 'food-drink', name: 'Food & Drink' },
    { id: 'beauty-wellness', name: 'Beauty & Wellness' },
    { id: 'professional-services', name: 'Professional Services' },
    { id: 'travel', name: 'Travel' },
    { id: 'outdoors-adventure', name: 'Outdoors & Adventure' },
    { id: 'experiences-entertainment', name: 'Entertainment & Experiences' },
    { id: 'arts-culture', name: 'Arts & Culture' },
    { id: 'family-pets', name: 'Family & Pets' },
    { id: 'shopping-lifestyle', name: 'Shopping & Lifestyle' },
    { id: 'miscellaneous', name: 'Miscellaneous' },
  ]);

  const normalizeInterestId = (interestId?: string | null) => {
    if (!interestId || interestId === 'uncategorized') return 'miscellaneous';
    return interestId;
  };

  // Extract unique interests from businesses
  const availableInterests = useMemo(() => {
    const uniqueInterestIds = Array.from(new Set(
      businesses
        .map(b => normalizeInterestId((b as any).interestId))
        .filter(Boolean)
    ));
    
    // Map to interest objects with names
    return interests.filter(interest => uniqueInterestIds.includes(interest.id));
  }, [businesses, interests]);

  // Filter and sort businesses by interest and rating
  const sortedBusinesses = useMemo(() => {
    const filtered = selectedInterest === "all"
      ? businesses
      : businesses.filter(b => normalizeInterestId((b as any).interestId) === selectedInterest);
    const getScore = (b: BusinessOfTheMonth) => {
      if (typeof b.totalRating === "number") return b.totalRating;
      if (typeof b.rating === "number") return b.rating;
      return 0;
    };
    return [...filtered].sort((a, b) => getScore(b) - getScore(a));
  }, [businesses, selectedInterest]);

  // Memoize the business arrays to prevent unnecessary recalculations
  const visibleBusinesses = useMemo(
    () => (showFullLeaderboard ? sortedBusinesses : sortedBusinesses.slice(0, 5)),
    [sortedBusinesses, showFullLeaderboard]
  );

  const hiddenBusinesses = useMemo(() => sortedBusinesses.slice(5), [sortedBusinesses]);

  return (
    <>
      {/* Interest Filter */}
      <div className="mb-6 sm:mb-8 px-2">
        <h3 className="font-urbanist text-caption sm:text-body-sm font-600 text-charcoal/70 mb-3 text-center">Filter by Interest</h3>
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 max-w-full">
          <button
            onClick={() => setSelectedInterest("all")}
            className={`
              px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-urbanist font-semibold text-caption sm:text-body-sm
              transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-sage/30
              whitespace-nowrap flex-shrink-0
              ${
                selectedInterest === "all"
                  ? 'bg-gradient-to-br from-sage to-sage/90 text-white shadow-md'
                  : 'bg-white/80 text-charcoal/70 hover:text-charcoal hover:bg-white border border-charcoal/20'
              }
            `}
          >
            All Interests
          </button>
          {availableInterests.map((interest) => {
            const isActive = selectedInterest === interest.id;
            const displayName = INTEREST_TITLES[interest.id] || interest.name;

            return (
              <button
                key={interest.id}
                onClick={() => setSelectedInterest(interest.id)}
                className={`
                  px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-urbanist font-semibold text-caption sm:text-body-sm
                  transition-all duration-300
                  focus:outline-none focus:ring-2 focus:ring-sage/30
                  whitespace-nowrap flex-shrink-0
                  ${
                    isActive
                      ? 'bg-gradient-to-br from-sage to-sage/90 text-white shadow-md'
                      : 'bg-white/80 text-charcoal/70 hover:text-charcoal hover:bg-white border border-charcoal/20'
                  }
                `}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      </div>

      <BusinessOfMonthPodium topBusinesses={sortedBusinesses.slice(0, 3)} />

      <div className="space-y-2 sm:space-y-3">
        {visibleBusinesses.map((business, index) => (
          <BusinessLeaderboardItem
            key={business.id}
            business={business}
            index={index}
            rank={index + 1}
          />
        ))}

        <AnimatePresence>
          {showFullLeaderboard &&
            hiddenBusinesses.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <BusinessLeaderboardItem
                  business={business}
                  index={index + 5}
                  rank={index + 6}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {sortedBusinesses.length > 5 && (
        <div className="text-center mt-6 sm:mt-8">
          <button
            onClick={onToggleFullLeaderboard}
            className="font-urbanist text-body-sm sm:text-body font-700 text-white transition-all duration-300 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-gradient-to-br from-sage to-sage/90 rounded-full flex items-center gap-1.5 sm:gap-2 mx-auto shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-sage ring-1 ring-white/30 hover:shadow-[0_10px_40px_rgba(0,0,0,0.25)] hover:scale-[1.02] active:scale-[0.98]"
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
      )}
    </>
  );
}

export default memo(BusinessOfMonthLeaderboard);
