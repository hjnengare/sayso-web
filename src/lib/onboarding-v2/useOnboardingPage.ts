/**
 * Onboarding V2 - Page Hook
 *
 * Hook for onboarding pages that:
 * 1. Fetches fresh state on mount
 * 2. Verifies access to current step
 * 3. Redirects if unauthorized
 * 4. Provides save function with automatic navigation
 *
 * Usage:
 * const { state, isLoading, error, canAccess, save, navigate } = useOnboardingPage('interests');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingState, OnboardingStep } from './state';
import { validateStepAccess, STEP_ROUTES } from './state';
import { fetchCurrentState } from './client';

interface UseOnboardingPageOptions {
  step: OnboardingStep;
  onSave: (selections: any) => Promise<{
    success: boolean;
    nextStep: OnboardingStep | null;
    error: string | null;
  }>;
}

interface UseOnboardingPageReturn {
  // State
  state: OnboardingState | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  canAccess: boolean;

  // Actions
  save: (selections: any) => Promise<void>;
  refetchState: () => Promise<void>;
}

export function useOnboardingPage(
  options: UseOnboardingPageOptions
): UseOnboardingPageReturn {
  const { step, onSave } = options;
  const router = useRouter();

  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);

  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  // Fetch current state on mount
  const fetchState = useCallback(async () => {
    if (!isMounted.current || hasFetched.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const currentState = await fetchCurrentState();

      if (!isMounted.current) return;

      if (!currentState) {
        setError('Failed to load onboarding state');
        setCanAccess(false);
        // Redirect to login after a delay
        setTimeout(() => {
          if (isMounted.current) {
            router.push('/login');
          }
        }, 1000);
        return;
      }

      setState(currentState);
      hasFetched.current = true;

      // Validate access
      const validation = validateStepAccess(currentState, step);

      setCanAccess(validation.canAccess);

      // If cannot access, redirect
      if (!validation.canAccess && validation.redirectTo) {
        console.log(`[OnboardingV2] Redirecting from ${step} to ${validation.redirectTo}`);
        router.replace(validation.redirectTo);
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error('[OnboardingV2] Error fetching state:', err);
      setError('Failed to load page. Please refresh.');
      setCanAccess(false);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [step, router]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchState();

    return () => {
      isMounted.current = false;
    };
  }, [fetchState]);

  // Refetch state (useful after saving)
  const refetchState = useCallback(async () => {
    hasFetched.current = false;
    await fetchState();
  }, [fetchState]);

  // Save function with automatic navigation
  const save = useCallback(
    async (selections: any) => {
      if (isSaving || !state) return;

      try {
        setIsSaving(true);
        setError(null);

        // Call the save function provided by the page
        const result = await onSave(selections);

        if (!isMounted.current) return;

        if (!result.success) {
          setError(result.error || 'Failed to save');
          setIsSaving(false);
          return;
        }

        // Fetch fresh state to verify save
        const freshState = await fetchCurrentState();

        if (!isMounted.current) return;

        if (!freshState) {
          setError('Failed to verify save');
          setIsSaving(false);
          return;
        }

        setState(freshState);

        // Navigate to next step
        if (result.nextStep) {
          const nextRoute = STEP_ROUTES[result.nextStep];
          console.log(`[OnboardingV2] Navigating to ${nextRoute}`);

          // Use replace to prevent back-button loops
          router.replace(nextRoute);
        }
      } catch (err) {
        if (!isMounted.current) return;
        console.error('[OnboardingV2] Error saving:', err);
        setError('Failed to save. Please try again.');
      } finally {
        if (isMounted.current) {
          setIsSaving(false);
        }
      }
    },
    [isSaving, state, onSave, router]
  );

  return {
    state,
    isLoading,
    isSaving,
    error,
    canAccess,
    save,
    refetchState
  };
}
