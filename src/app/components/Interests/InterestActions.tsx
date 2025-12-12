"use client";

import OnboardingButton from "../Onboarding/OnboardingButton";

interface InterestActionsProps {
  canProceed: boolean;
  isNavigating: boolean;
  selectedCount: number;
  minSelections: number;
  onContinue: () => void;
}

export default function InterestActions({ 
  canProceed, 
  isNavigating, 
  selectedCount, 
  minSelections, 
  onContinue
}: InterestActionsProps) {
  return (
    <div className="pt-4 space-y-4 enter-fade" style={{ animationDelay: "0.15s" }}>
      <OnboardingButton
        canProceed={canProceed}
        isNavigating={isNavigating}
        selectedCount={selectedCount}
        onClick={onContinue}
        variant="continue"
      />
    </div>
  );
}
