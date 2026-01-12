/**
 * useCompletePage Hook (Simplified - localStorage only)
 * Encapsulates all logic for the complete page
 */

import { useState, useCallback, useEffect } from 'react';
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
  isLoading: boolean;
}

export function useCompletePage(): UseCompletePageReturn {
  const { showToast } = useToast();
  const { user } = useAuth();
  const {
    selectedInterests,
    selectedSubInterests,
    selectedDealbreakers,
    completeOnboarding,
    isLoading: contextLoading,
    error: contextError
  } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get data from localStorage (OnboardingContext)
  const interests: string[] = selectedInterests || [];
  const subcategories: string[] = selectedSubInterests || [];
  const dealbreakers: string[] = selectedDealbreakers || [];
  const isLoading = contextLoading;

  // Verify user is at correct step - middleware should handle redirects
  useEffect(() => {
    if (user?.profile?.onboarding_step !== 'complete') {
      console.warn('[Complete] User not at complete step, middleware should redirect');
    }
  }, [user]);

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
    isLoading,
  };
}

