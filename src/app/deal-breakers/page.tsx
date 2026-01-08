"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import { Loader } from "../components/Loader";
import DealBreakerStyles from "../components/DealBreakers/DealBreakerStyles";
import DealBreakerHeader from "../components/DealBreakers/DealBreakerHeader";
import DealBreakerSelection from "../components/DealBreakers/DealBreakerSelection";
import DealBreakerGrid from "../components/DealBreakers/DealBreakerGrid";
import DealBreakerActions from "../components/DealBreakers/DealBreakerActions";
import { useDealBreakersPage } from "../hooks/useDealBreakersPage";
import { OnboardingErrorBoundary } from "../components/Onboarding/OnboardingErrorBoundary";

const MAX_SELECTIONS = 3;

function DealBreakersContent() {
  const {
    dealbreakers,
    selectedDealbreakers,
    isNavigating,
    canProceed,
    handleToggle,
    handleNext,
    isLoading,
    error,
  } = useDealBreakersPage();

  if (isLoading) {
    return (
      <OnboardingLayout step={3} backHref="/subcategories">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader size="md" variant="wavy" color="sage" />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingErrorBoundary>
      <DealBreakerStyles />
      <OnboardingLayout step={3} backHref="/subcategories">
        <DealBreakerHeader />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {error && (
            <motion.div
              className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-center mb-4"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
                delay: 0.1,
              }}
            >
              <p className="text-sm font-semibold text-red-600">
                {error.message || 'An error occurred'}
              </p>
            </motion.div>
          )}

          <DealBreakerSelection selectedCount={selectedDealbreakers.length} maxSelections={MAX_SELECTIONS}>
            <DealBreakerGrid 
              dealbreakers={dealbreakers}
              selectedDealbreakers={selectedDealbreakers}
              maxSelections={MAX_SELECTIONS}
              onToggle={handleToggle}
            />
          </DealBreakerSelection>

          <DealBreakerActions
            canProceed={canProceed}
            isNavigating={isNavigating}
            selectedCount={selectedDealbreakers.length}
            onComplete={handleNext}
          />
        </motion.div>
      </OnboardingLayout>
    </OnboardingErrorBoundary>
  );
}

export default function DealBreakersPage() {
  return (
    <ProtectedRoute requiresAuth={true}>
      <Suspense fallback={
        <OnboardingLayout step={3} backHref="/interests">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader size="md" variant="wavy" color="sage" />
          </div>
        </OnboardingLayout>
      }>
        <DealBreakersContent />
      </Suspense>
    </ProtectedRoute>
  );
}
