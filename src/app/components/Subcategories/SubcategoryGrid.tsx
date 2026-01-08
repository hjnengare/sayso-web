"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import SubcategoryGroup from "./SubcategoryGroup";

interface SubcategoryItem {
  id: string;
  label: string;
  interest_id: string;
}

interface GroupedSubcategories {
  [interestId: string]: {
    title: string;
    items: SubcategoryItem[];
  };
}

interface SubcategoryGridProps {
  groupedSubcategories: GroupedSubcategories;
  selectedSubcategories: Array<{ id: string; interest_id: string }>;
  maxSelections: number;
  onToggle: (id: string, interestId: string) => void;
  subcategories: SubcategoryItem[];
  loading: boolean;
  shakingIds?: Set<string>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

function SubcategoryGrid({ 
  groupedSubcategories, 
  selectedSubcategories, 
  maxSelections,
  onToggle, 
  subcategories, 
  loading,
  shakingIds = new Set()
}: SubcategoryGridProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Object.entries(groupedSubcategories).map(([interestId, group], groupIndex) => (
        <SubcategoryGroup
          key={interestId}
          interestId={interestId}
          title={group.title}
          items={group.items}
          selectedSubcategories={selectedSubcategories}
          maxSelections={maxSelections}
          onToggle={onToggle}
          groupIndex={groupIndex}
          shakingIds={shakingIds}
        />
      ))}

      {subcategories.length === 0 && !loading && (
        <motion.div
          className="text-center text-charcoal/60 py-8"
          style={sfPro}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p>No subcategories found for your selected interests.</p>
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(SubcategoryGrid);
