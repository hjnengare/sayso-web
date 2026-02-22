"use client";

import { m } from "framer-motion";
import OnboardingButton from "../Onboarding/OnboardingButton";

interface SubcategoryActionsProps {
  canProceed: boolean;
  isNavigating: boolean;
  isLoading: boolean;
  selectedCount: number;
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

export default function SubcategoryActions({ 
  canProceed, 
  isNavigating, 
  isLoading, 
  selectedCount, 
  onContinue
}: SubcategoryActionsProps) {
  return (
    <m.div
      className="pt-6"
      variants={actionsVariants}
      initial="hidden"
      animate="visible"
    >
      <OnboardingButton
        canProceed={canProceed}
        isNavigating={isNavigating}
        isLoading={isLoading}
        selectedCount={selectedCount}
        onClick={onContinue}
        variant="continue"
      />
    </m.div>
  );
}
