"use client";

import { memo } from "react";
import { m } from "framer-motion";
import SubcategoryPill from "./SubcategoryPill";

interface SubcategoryItem {
  id: string;
  label: string;
  interest_id: string;
}

interface SubcategoryGroupProps {
  interestId: string;
  title: string;
  items: SubcategoryItem[];
  selectedSubcategories: Array<{ id: string; interest_id: string }>;
  maxSelections: number;
  onToggle: (id: string, interestId: string) => void;
  groupIndex: number;
  shakingIds?: Set<string>;
}

const groupVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (groupIndex: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: groupIndex * 0.08,
      duration: 0.4,
      ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number],
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  }),
};

const titleVariants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

function SubcategoryGroup({ 
  interestId, 
  title, 
  items, 
  selectedSubcategories, 
  maxSelections,
  onToggle, 
  groupIndex,
  shakingIds = new Set()
}: SubcategoryGroupProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  };

  return (
    <m.div
      variants={groupVariants}
      initial="hidden"
      animate="visible"
      custom={groupIndex}
    >
      <m.h3
        className="text-base md:text-lg font-bold text-charcoal mb-3"
        style={sfPro}
        variants={titleVariants}
      >
        {title}
      </m.h3>
      <div className="pills-container">
        {items.map((subcategory, index) => {
          const isSelected = selectedSubcategories.some(s => s.id === subcategory.id);
          const isDisabled = !isSelected && selectedSubcategories.length >= maxSelections;
          const shouldShake = shakingIds.has(subcategory.id);
          
          return (
            <SubcategoryPill
              key={subcategory.id}
              subcategory={subcategory}
              isSelected={isSelected}
              isDisabled={isDisabled}
              shouldShake={shouldShake}
              onToggle={onToggle}
              index={index}
            />
          );
        })}
      </div>
    </m.div>
  );
}

export default memo(SubcategoryGroup);
