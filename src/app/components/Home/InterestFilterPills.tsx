"use client";

import { useEffect } from "react";
import { useUserPreferences, UserPreference } from "../../hooks/useUserPreferences";

interface InterestFilterPillsProps {
  selectedInterestIds: string[];
  onToggleInterest: (interestId: string) => void;
}

export default function InterestFilterPills({
  selectedInterestIds,
  onToggleInterest,
}: InterestFilterPillsProps) {
  const { interests, loading, error } = useUserPreferences();

  // Debug logging
  useEffect(() => {
    console.log('[InterestFilterPills] State:', { loading, interestsCount: interests.length, interests, error });
  }, [loading, interests, error]);

  // Show loading skeleton while loading
  if (loading) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-off-white/50 animate-pulse"
            style={{ width: '80px', height: '36px' }}
          />
        ))}
      </div>
    );
  }

  // Don't show anything if no interests
  if (interests.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {interests.map((interest) => {
        const isSelected = selectedInterestIds.includes(interest.id);
        return (
          <button
            key={interest.id}
            onClick={() => onToggleInterest(interest.id)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-urbanist font-600 text-body-sm sm:text-body transition-all duration-200 active:scale-95 ${
              isSelected
                ? "bg-coral text-white shadow-lg"
                : "bg-off-white text-charcoal/70 hover:bg-coral/10 hover:text-coral border border-charcoal/20"
            }`}
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {interest.name}
          </button>
        );
      })}
    </div>
  );
}

