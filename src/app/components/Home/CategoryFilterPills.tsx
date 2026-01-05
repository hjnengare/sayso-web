"use client";

import { useOnboarding } from "../../contexts/OnboardingContext";
import { useEffect } from "react";

interface CategoryFilterPillsProps {
  selectedCategoryIds: string[]; // Active filters (user-initiated)
  preferredCategoryIds?: string[]; // User preferences (from onboarding, visual only)
  onToggleCategory: (categoryId: string) => void;
}

export default function CategoryFilterPills({
  selectedCategoryIds,
  preferredCategoryIds = [],
  onToggleCategory,
}: CategoryFilterPillsProps) {
  // Get all available interests catalog from OnboardingContext
  const { interests, loadInterests, isLoading } = useOnboarding();
  
  // Load interests catalog on mount if not already loaded
  useEffect(() => {
    if (interests.length === 0 && !isLoading) {
      loadInterests();
    }
  }, [interests.length, isLoading, loadInterests]);
  
  const loading = isLoading;

  // Show loading skeleton while loading
  if (loading) {
    return (
      <div 
        className="flex sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-x-visible scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        }}
      >
        <div className="flex items-center gap-2 min-w-max">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-off-white/50 animate-pulse flex-shrink-0"
              style={{ width: '100px', height: '36px' }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Show helpful message if no interests (instead of silently returning null)
  if (interests.length === 0) {
    return (
      <div className="text-sm text-charcoal/50 px-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        No interests yet (complete onboarding to see filters).
      </div>
    );
  }

  return (
    <div 
      className="flex sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-x-visible scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
      style={{ 
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
      }}
    >
      <div className="flex items-center gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
        {interests.map((interest) => {
          const isActive = selectedCategoryIds.includes(interest.id); // Active filter (user-initiated)
          const isPreferred = preferredCategoryIds.includes(interest.id); // User preference (visual only)
          
          // ✅ Visual states (never used for logic):
          // - isActive: filled/bold (explicit filter)
          // - isPreferred: subtle highlight (preference indicator)
          // - Both: filled + indicator
          
          return (
            <button
              key={interest.id}
              onClick={() => onToggleCategory(interest.id)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-urbanist font-600 text-body-sm sm:text-body transition-all duration-200 active:scale-95 flex-shrink-0 whitespace-nowrap relative ${
                isActive
                  ? "bg-coral text-white shadow-lg" // Active filter: filled
                  : isPreferred
                  ? "bg-sage/15 text-sage border-2 border-sage/40 hover:bg-sage/25" // Preferred: subtle highlight
                  : "bg-sage/10 text-charcoal/70 hover:bg-sage/20 hover:text-sage border border-sage/30" // Default: neutral
              }`}
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {interest.name}
              {/* ✅ Visual indicator for preferred (when not active) */}
              {isPreferred && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-sage rounded-full border border-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

