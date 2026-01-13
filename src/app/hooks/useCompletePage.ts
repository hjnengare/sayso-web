/**
 * useCompletePage Hook (Simplified - localStorage only)
 * Encapsulates all logic for the complete page
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export interface UseCompletePageReturn {
  isSaving: boolean;
  hasSaved: boolean;
  error: string | null;
  handleContinue: (e: React.MouseEvent) => void;
  interests: string[];
  subcategories: string[];
  dealbreakers: string[];
}

export function useCompletePage(): UseCompletePageReturn {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const {
    selectedInterests,
    selectedSubInterests,
    selectedDealbreakers,
    completeOnboarding,
    error: contextError
  } = useOnboarding();
  const [isSaving, setIsSaving] = useState(true); // Start as true until we verify access
  const [hasSaved, setHasSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get data from localStorage (OnboardingContext)
  const interests: string[] = selectedInterests || [];
  const subcategories: string[] = selectedSubInterests || [];
  const dealbreakers: string[] = selectedDealbreakers || [];

  // Verify user is at correct step and redirect if not
  useEffect(() => {
    let cancelled = false;

    const verifyAccess = async () => {
      console.log('[Complete] Verifying access...', {
        authLoading,
        user_exists: !!user,
        user_id: user?.id,
        onboarding_step: user?.profile?.onboarding_step,
        onboarding_complete: user?.profile?.onboarding_complete
      });

      try {
        // Wait for auth to load
        if (authLoading) {
          console.log('[Complete] Waiting for auth to load...');
          return;
        }

        // No user - redirect to login
        if (!user) {
          console.log('[Complete] No user, redirecting to login');
          router.replace('/login');
          return;
        }

        const onboardingStep = user.profile?.onboarding_step;
        const onboardingComplete = user.profile?.onboarding_complete;

        console.log('[Complete] User state:', { onboardingStep, onboardingComplete });

        // If onboarding already completed, go to home
        if (onboardingComplete) {
          console.log('[Complete] Onboarding already complete, redirecting to home');
          router.replace('/home');
          return;
        }

        // Not at complete step yet - redirect to correct step
        if (onboardingStep !== 'complete') {
          console.log('[Complete] User not at complete step, redirecting to:', onboardingStep || 'interests');
          const nextRoute = onboardingStep === 'interests' ? '/interests'
            : onboardingStep === 'subcategories' ? '/subcategories'
            : onboardingStep === 'deal-breakers' ? '/deal-breakers'
            : '/interests';
          router.replace(nextRoute);
          return;
        }

        // User is at correct step - allow access
        console.log('[Complete] Access granted, showing page');
        if (!cancelled) {
          setIsSaving(false);
        }
      } catch (error) {
        console.error('[Complete] Error verifying access:', error);
        // On error, redirect to start of onboarding
        router.replace('/interests');
      }
    };

    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  // Handle continue button click - saves all data and marks onboarding as complete
  const handleContinue = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isSaving || hasSaved) {
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        // Save all data to database and mark onboarding as complete
        // This will save interests, subcategories, dealbreakers from localStorage
        await completeOnboarding();

        // If no error was thrown, consider it successful
        if (!contextError) {
          setHasSaved(true);
        } else {
          setError(contextError || 'Failed to complete onboarding');
        }
      } catch (err) {
        console.error('[Complete] Error completing onboarding:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to complete onboarding';
        setError(errorMessage);
        showToast(errorMessage, 'error', 5000);
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, hasSaved, completeOnboarding, contextError, showToast]
  );

  return {
    isSaving,
    hasSaved,
    error: error || contextError,
    handleContinue,
    interests,
    subcategories,
    dealbreakers,
  };
}

