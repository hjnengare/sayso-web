"use client";

import { m } from "framer-motion";
import OnboardingButton from "../Onboarding/OnboardingButton";

interface InterestActionsProps {
  canProceed: boolean;
  isNavigating: boolean;
  selectedCount: number;
  minSelections: number;
  onContinue: () => void;
}

const actionsVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number],
      delay: 0.15,
    },
  },
};

export default function InterestActions({ 
  canProceed, 
  isNavigating, 
  selectedCount, 
  minSelections, 
  onContinue
}: InterestActionsProps) {
  return (
    <m.div
      className="pt-4 space-y-4"
      variants={actionsVariants}
      initial="hidden"
      animate="visible"
    >
      <OnboardingButton
        canProceed={canProceed}
        isNavigating={isNavigating}
        selectedCount={selectedCount}
        onClick={onContinue}
        variant="continue"
      />
    </m.div>
  );
}
