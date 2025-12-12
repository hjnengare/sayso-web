"use client";

import OnboardingButton from "../Onboarding/OnboardingButton";

interface DealBreakerActionsProps {
  canProceed: boolean;
  isNavigating: boolean;
  selectedCount: number;
  onComplete: () => void;
}

export default function DealBreakerActions({ 
  canProceed, 
  isNavigating, 
  selectedCount, 
  onComplete
}: DealBreakerActionsProps) {
  return (
    <div className="pt-2">
      <OnboardingButton
        canProceed={canProceed}
        isNavigating={isNavigating}
        selectedCount={selectedCount}
        onClick={onComplete}
        variant="complete"
      />
    </div>
  );
}
