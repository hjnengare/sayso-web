"use client";

import { memo } from "react";
import InterestButton from "./InterestButton";

interface Interest {
  id: string;
  name: string;
}

interface InterestGridProps {
  interests: Interest[];
  selectedInterests: string[];
  maxSelections: number;
  animatingIds: Set<string>;
  onToggle: (id: string) => void;
}

function InterestGrid({ 
  interests, 
  selectedInterests, 
  maxSelections, 
  animatingIds, 
  onToggle 
}: InterestGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-6 mb-4 overflow-visible">
      {interests.map((interest, idx) => {
        const isSelected = selectedInterests.includes(interest.id);
        const isDisabled = !isSelected && selectedInterests.length >= maxSelections;
        const isAnimating = animatingIds.has(interest.id);

        return (
          <InterestButton
            key={interest.id}
            interest={interest}
            isSelected={isSelected}
            isDisabled={isDisabled}
            isAnimating={isAnimating}
            onToggle={onToggle}
            index={idx}
          />
        );
      })}
    </div>
  );
}

export default memo(InterestGrid);
