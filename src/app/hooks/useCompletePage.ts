/**
 * useCompletePage Hook
 * Encapsulates all logic for the complete page
 */

import { useState, useCallback, useEffect } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useOnboardingData } from './useOnboardingData';

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
  const { submitComplete, isLoading: contextLoading, error: contextError } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from DB to display on complete page (refresh-proof)
  const { data, isLoading: dataLoading } = useOnboardingData({
    loadFromDatabase: true,
  });

  const interests: string[] = data.interests || [];
  const subcategories: string[] = data.subcategories || [];
  const dealbreakers: string[] = data.dealbreakers || [];
  const isLoading = contextLoading || dataLoading;

  // Verify user is at correct step - middleware should handle redirects
  useEffect(() => {
    if (user?.profile?.onboarding_step !== 'complete') {
      console.warn('[Complete] User not at complete step, middleware should redirect');
    }
  }, [user]);

  // Handle continue button click - marks onboarding as complete
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
        // Submit to API (marks onboarding_complete=true)
        // Data should already be saved from previous steps
        const success = await submitComplete();
        
        if (success) {
          setHasSaved(true);
          // Navigation happens in submitComplete
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
    [isSaving, hasSaved, submitComplete, contextError, showToast]
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

