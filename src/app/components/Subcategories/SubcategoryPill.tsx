"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface SubcategoryPillProps {
  subcategory: {
    id: string;
    label: string;
    interest_id: string;
  };
  isSelected: boolean;
  isDisabled?: boolean;
  shouldShake?: boolean;
  onToggle: (id: string, interestId: string) => void;
  index?: number;
}

const pillVariants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: (index: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: index * 0.03,
      duration: 0.3,
      ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number],
    },
  }),
  selected: {
    scale: 1.05,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
  unselected: {
    scale: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17,
    },
  },
  tap: {
    scale: 0.95,
  },
  shake: {
    x: [0, -4, 4, -3, 2, 0],
    transition: {
      duration: 0.35,
      ease: "easeInOut" as const,
    },
  },
};

const checkIconVariants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 25,
    },
  },
};

function SubcategoryPill({ 
  subcategory, 
  isSelected, 
  isDisabled = false, 
  shouldShake = false,
  onToggle,
  index = 0
}: SubcategoryPillProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  return (
    <motion.button
      onClick={() => !isDisabled && onToggle(subcategory.id, subcategory.interest_id)}
      disabled={isDisabled}
      variants={pillVariants}
      initial="initial"
      animate={[
        "animate",
        isSelected ? "selected" : "unselected",
        ...(shouldShake ? ["shake"] : []),
      ]}
      whileHover={!isDisabled && !isSelected ? "hover" : undefined}
      whileTap={!isDisabled ? "tap" : undefined}
      custom={index}
      className={`
        relative flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium
        focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2
        ${isSelected
          ? 'border-coral bg-gradient-to-br from-coral to-coral/90 text-white'
          : isDisabled
          ? 'border-charcoal/10 bg-charcoal/5 text-charcoal/40 cursor-not-allowed opacity-60'
          : 'border-sage/30 bg-gradient-to-br from-sage/10 to-sage/5 text-sage backdrop-blur-sm'
        }
      `}
      style={sfPro}
    >
      <span>{subcategory.label}</span>
      {isSelected && (
        <motion.div
          variants={checkIconVariants}
          initial="hidden"
          animate="visible"
        >
          <CheckCircle className="h-4 w-4" />
        </motion.div>
      )}
    </motion.button>
  );
}

export default memo(SubcategoryPill);
