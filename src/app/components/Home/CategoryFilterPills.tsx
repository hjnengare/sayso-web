"use client";

import { useOnboarding } from "../../contexts/OnboardingContext";
import { useEffect } from "react";

interface CategoryFilterPillsProps {
  selectedCategoryIds: string[];
  onToggleCategory: (categoryId: string) => void;
}

export default function CategoryFilterPills({
  selectedCategoryIds,
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
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-off-white/50 animate-pulse"
            style={{ width: '100px', height: '36px' }}
          />
        ))}
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
    <div className="flex flex-wrap items-center gap-2">
      {interests.map((interest) => {
        const isSelected = selectedCategoryIds.includes(interest.id);
        return (
          <button
            key={interest.id}
            onClick={() => onToggleCategory(interest.id)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-urbanist font-600 text-body-sm sm:text-body transition-all duration-200 active:scale-95 ${
              isSelected
                ? "bg-coral text-white shadow-lg"
                : "bg-sage/10 text-charcoal/70 hover:bg-sage/20 hover:text-sage border border-sage/30"
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

