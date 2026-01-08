"use client";

import { useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "../contexts/ToastContext";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import { Loader } from "../components/Loader";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import EmailVerificationBanner from "../components/Auth/EmailVerificationBanner";
import InterestStyles from "../components/Interests/InterestStyles";
import InterestHeader from "../components/Interests/InterestHeader";
import InterestSelection from "../components/Interests/InterestSelection";
import InterestGrid from "../components/Interests/InterestGrid";
import InterestActions from "../components/Interests/InterestActions";
import { useInterestsPage } from "../hooks/useInterestsPage";
import { OnboardingErrorBoundary } from "../components/Onboarding/OnboardingErrorBoundary";

const MIN_SELECTIONS = 3;
const MAX_SELECTIONS = 6;

function InterestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToastOnce } = useToast();

  const {
    interests,
    selectedInterests,
    isNavigating,
    animatingIds,
    shakingIds,
    canProceed,
    handleToggle,
    handleNext,
    isLoading,
    error,
  } = useInterestsPage();

  // Handle verification success from URL flag
  useEffect(() => {
    const verified = searchParams.get('verified');
    const emailVerified = searchParams.get('email_verified');
    
    if (verified === '1' || emailVerified === 'true') {
      showToastOnce('email-verified-v1', '🎉 You\'re verified! Your account is now secured and ready.', 'success', 3000);

      requestAnimationFrame(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('verified');
        url.searchParams.delete('email_verified');
        router.replace(url.pathname + (url.search ? '?' + url.searchParams.toString() : ''), { scroll: false });
      });
    }
  }, [searchParams, router, showToastOnce]);

  if (isLoading) {
    return (
      <OnboardingLayout backHref="/register" step={1}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader size="md" variant="wavy" color="sage" />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <EmailVerificationGuard>
      <OnboardingErrorBoundary>
        <InterestStyles />

        <OnboardingLayout
          backHref="/register"
          step={1}
        >
          <EmailVerificationBanner className="mb-4" />
          <InterestHeader isOnline={true} />

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

            <InterestSelection 
              selectedCount={selectedInterests.length}
              minSelections={MIN_SELECTIONS}
              maxSelections={MAX_SELECTIONS}
            />

            <InterestGrid
              interests={interests}
              selectedInterests={selectedInterests}
              maxSelections={MAX_SELECTIONS}
              animatingIds={animatingIds}
              shakingIds={shakingIds}
              onToggle={handleToggle}
            />

            <InterestActions
              canProceed={canProceed}
              isNavigating={isNavigating}
              selectedCount={selectedInterests.length}
              minSelections={MIN_SELECTIONS}
              onContinue={handleNext}
            />
          </motion.div>
        </OnboardingLayout>
      </OnboardingErrorBoundary>
    </EmailVerificationGuard>
  );
}

// Force dynamic rendering to prevent stale data
export const dynamic = 'force-dynamic';

export default function InterestsPage() {
  return (
    <ProtectedRoute requiresAuth={true}>
      <Suspense fallback={
        <OnboardingLayout backHref="/register" step={1}>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader size="md" variant="wavy" color="sage" />
          </div>
        </OnboardingLayout>
      }>
        <InterestsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
