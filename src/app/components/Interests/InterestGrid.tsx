"use client";

import { memo } from "react";
import { motion } from "framer-motion";
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
  shakingIds: Set<string>;
  onToggle: (id: string) => void;
}

const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1,
    },
  },
};

function InterestGrid({ 
  interests, 
  selectedInterests, 
  maxSelections, 
  animatingIds,
  shakingIds,
  onToggle 
}: InterestGridProps) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-3 md:gap-6 mb-4 overflow-visible"
      variants={gridVariants}
      initial="hidden"
      animate="visible"
    >
      {interests.map((interest, idx) => {
        const isSelected = selectedInterests.includes(interest.id);
        const isDisabled = !isSelected && selectedInterests.length >= maxSelections;
        const isAnimating = animatingIds.has(interest.id);
        const shouldShake = shakingIds.has(interest.id);

        return (
          <InterestButton
            key={interest.id}
            interest={interest}
            isSelected={isSelected}
            isDisabled={isDisabled}
            isAnimating={isAnimating}
            shouldShake={shouldShake}
            onToggle={onToggle}
            index={idx}
          />
        );
      })}
    </motion.div>
  );
}

export default memo(InterestGrid);
