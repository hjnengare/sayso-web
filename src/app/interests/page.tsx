"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
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
  const { user, isLoading, refreshUser } = useAuth();

  // CRITICAL: Extract user role - business owners must NEVER access this page
  // Check account_role FIRST (this is what gets updated by sync logic)
  // Then check role as fallback. If EITHER is business_owner, treat as business owner.
  const currentRole = user?.profile?.account_role;
  const role = user?.profile?.role;
  const isBusinessOwner = currentRole === 'business_owner' || role === 'business_owner';

  // Debug logging for role detection
  console.log('[InterestsPage] Role detection:', {
    currentRole,
    role,
    isBusinessOwner,
    profileExists: !!user?.profile,
    userId: user?.id
  });

  const {
    interests,
    selectedInterests,
    isNavigating,
    animatingIds,
    shakingIds,
    canProceed,
    handleToggle,
    handleNext,
    error,
  } = useInterestsPage();

  // CRITICAL: Sync profile role with user metadata as a fallback
  // This fixes users whose profile was created with wrong role by the database trigger
  useEffect(() => {
    const syncProfileRole = async () => {
      if (isLoading || !user?.id) return;

      try {
        const response = await fetch('/api/auth/sync-profile-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        console.log('[InterestsPage] Profile sync result:', data);

        if (data.synced && data.newRole === 'business_owner') {
          console.log('[InterestsPage] Profile synced to business_owner, refreshing and redirecting');
          // Refresh the user context to pick up the new role
          await refreshUser();
          router.replace('/my-businesses');
        }
      } catch (err) {
        console.error('[InterestsPage] Error syncing profile role:', err);
      }
    };

    syncProfileRole();
  }, [isLoading, user?.id, refreshUser, router]);

  // CRITICAL: Redirect business owners away from personal onboarding
  // This is a second-layer guard in case ProtectedRoute doesn't catch it
  useEffect(() => {
    if (!isLoading && isBusinessOwner) {
      console.log('[InterestsPage] Business owner detected, redirecting to /my-businesses');
      router.replace('/my-businesses');
    }
  }, [isLoading, isBusinessOwner, router]);

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

  // Don't render personal onboarding content for business owners
  if (isBusinessOwner) {
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

          <div className="animate-fade-in-up">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-center mb-4 animate-fade-in-up delay-100">
                <p className="text-sm font-semibold text-red-600">
                  {error instanceof Error ? error.message : String(error) || 'An error occurred'}
                </p>
              </div>
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
          </div>
        </OnboardingLayout>
      </OnboardingErrorBoundary>
    </EmailVerificationGuard>
  );
}

// Optimize: Allow static generation where possible - interests are static data
export const dynamic = 'auto';

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

