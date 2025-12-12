"use client";

import OnboardingButton from "../Onboarding/OnboardingButton";

interface SubcategoryActionsProps {
  canProceed: boolean;
  isNavigating: boolean;
  isLoading: boolean;
  selectedCount: number;
  onContinue: () => void;
}

export default function SubcategoryActions({ 
  canProceed, 
  isNavigating, 
  isLoading, 
  selectedCount, 
  onContinue
}: SubcategoryActionsProps) {
  return (
    <div className="pt-6">
      <OnboardingButton
        canProceed={canProceed}
        isNavigating={isNavigating}
        isLoading={isLoading}
        selectedCount={selectedCount}
        onClick={onContinue}
        variant="continue"
      />
    </div>
  );
}
