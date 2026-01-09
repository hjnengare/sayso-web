/**
 * useInterestsPage Hook
 * Encapsulates all logic for the interests page
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingData } from './useOnboardingData';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useToast } from '../contexts/ToastContext';
import { validateSelectionCount, validateInterestIds } from '../lib/onboarding/validation';
import { useOnboardingSafety } from './useOnboardingSafety';
import { apiClient } from '../lib/api/apiClient';

const INTERESTS: Array<{ id: string; name: string }> = [
  { id: 'food-drink', name: 'Food & Drink' },
  { id: 'beauty-wellness', name: 'Beauty & Wellness' },
  { id: 'professional-services', name: 'Professional Services' },
  { id: 'outdoors-adventure', name: 'Outdoors & Adventure' },
  { id: 'experiences-entertainment', name: 'Entertainment & Experiences' },
  { id: 'arts-culture', name: 'Arts & Culture' },
  { id: 'family-pets', name: 'Family & Pets' },
  { id: 'shopping-lifestyle', name: 'Shopping & Lifestyle' },
];

const MIN_SELECTIONS = 3;
const MAX_SELECTIONS = 6;

const VALID_INTEREST_IDS = INTERESTS.map((i) => i.id);

export interface UseInterestsPageReturn {
  interests: typeof INTERESTS;
  selectedInterests: string[];
  isNavigating: boolean;
  animatingIds: Set<string>;
  shakingIds: Set<string>;
  canProceed: boolean;
  handleToggle: (interestId: string) => void;
  handleNext: () => void;
  isLoading: boolean;
  error: Error | null;
}

export function useInterestsPage(): UseInterestsPageReturn {
  const router = useRouter();
  const { showToast } = useToast();
  const { setSelectedInterests, isLoading: contextLoading, error: contextError } = useOnboarding();
  const [isNavigating, setIsNavigating] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [shakingIds, setShakingIds] = useState<Set<string>>(new Set());
  const hasPrefetchedRef = useRef(false);
  
  // Safety utilities
  const { isMounted, withTimeout, preventDoubleSubmit, handleBeforeUnload } = useOnboardingSafety({
    timeout: 30000,
    preventDoubleSubmit: true,
    checkSessionOnMount: true,
  });

  const {
    data,
    isLoading: dataLoading,
    error: dataError,
    updateInterests,
    refresh: refreshOnboardingData,
  } = useOnboardingData({
    loadFromDatabase: false, // Don't load from DB on first step to avoid pre-selecting old data for new users
  });

  const selectedInterests = data.interests;
  
  // Sync OnboardingContext with useOnboardingData
  useEffect(() => {
    if (selectedInterests.length > 0) {
      setSelectedInterests(selectedInterests);
    }
  }, [selectedInterests, setSelectedInterests]);
  
  const isLoading = dataLoading || contextLoading;
  // Convert string error from context to Error object if needed
  const error: Error | null = dataError || (contextError ? new Error(contextError) : null);

  // Skip unnecessary data refresh - interests page doesn't load from DB initially
  // This reduces unnecessary API calls on mount

  // Early prefetching of all onboarding pages for instant navigation
  useEffect(() => {
    // Prefetch all next onboarding pages immediately
    router.prefetch('/subcategories');
    router.prefetch('/deal-breakers');
    router.prefetch('/complete');
  }, [router]);

  // Additional prefetch when minimum reached (double-prefetch for reliability)
  useEffect(() => {
    if (selectedInterests.length >= MIN_SELECTIONS && !hasPrefetchedRef.current) {
      router.prefetch('/subcategories');
      hasPrefetchedRef.current = true;
    }
  }, [selectedInterests.length, router]);

  // Trigger bounce animation
  const triggerBounce = useCallback((id: string, ms = 700) => {
    setAnimatingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setAnimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, ms);
  }, []);

  // Trigger shake animation
  const triggerShake = useCallback((id: string) => {
    setShakingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setShakingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 600);
  }, []);

  // Handle interest toggle
  const handleToggle = useCallback(
    (interestId: string) => {
      // Validate interest ID
      const idValidation = validateInterestIds([interestId], VALID_INTEREST_IDS);
      if (!idValidation.valid) {
        console.warn('[Interests] Invalid interest ID:', interestId);
        return;
      }

      const isCurrentlySelected = selectedInterests.includes(interestId);
      triggerBounce(interestId);

      // Check max selections
      if (!isCurrentlySelected && selectedInterests.length >= MAX_SELECTIONS) {
        showToast(`Maximum ${MAX_SELECTIONS} interests allowed`, 'warning', 2000);
        triggerShake(interestId);
        return;
      }

      // Toggle selection
      const newSelection = isCurrentlySelected
        ? selectedInterests.filter((id) => id !== interestId)
        : [...selectedInterests, interestId];

      updateInterests(newSelection);

      // Show feedback
      if (!isCurrentlySelected) {
        if (newSelection.length === MIN_SELECTIONS) {
          showToast('🎉 Great! You can continue now', 'sage', 2000);
        } else if (newSelection.length === MAX_SELECTIONS) {
          showToast('✨ Perfect selection!', 'sage', 2000);
        }
      }
    },
    [selectedInterests, updateInterests, showToast, triggerBounce, triggerShake]
  );

  // Handle next navigation - saves to DB and advances step
  const handleNextInternal = useCallback(async () => {
    console.log('[useInterestsPage] handleNext called', { 
      selectedCount: selectedInterests?.length || 0,
      interests: selectedInterests 
    });

    // Validate selections
    const validation = validateSelectionCount(selectedInterests, {
      min: MIN_SELECTIONS,
      max: MAX_SELECTIONS,
    }, 'interests');

    if (!validation.valid) {
      console.warn('[useInterestsPage] Validation failed:', validation.errors);
      validation.errors.forEach((error) => showToast(error, 'warning', 3000));
      return;
    }

    // Safe state update (only if mounted)
    if (!isMounted()) return;
    console.log('[useInterestsPage] Validation passed, setting navigating state...');
    setIsNavigating(true);

    try {
      // Ensure OnboardingContext has latest selections
      if (!isMounted()) return;
      console.log('[useInterestsPage] Syncing selections to context...');
      setSelectedInterests(selectedInterests);
      
      // Save to API with timeout
      console.log('[useInterestsPage] Saving interests to API...');
      const fetchPromise = fetch('/api/onboarding/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store', // Ensure fresh data
        body: JSON.stringify({
          interests: selectedInterests
        })
      });

      const response = await withTimeout(fetchPromise, 30000);

      let payload: any = null;
      try { payload = await response.json(); } catch {}

      if (response.status === 401) {
        if (!isMounted()) return;
        showToast('Your session expired. Please log in again.', 'warning', 3000);
        router.replace('/login'); // Use replace to prevent back navigation
        return;
      }

      if (!response.ok) {
        const msg = payload?.error || payload?.message || 'Failed to save interests';
        throw new Error(msg);
      }

      console.log('[useInterestsPage] Save successful, navigating to subcategories...');
      
      // Don't invalidate cache - next page will handle its own data loading
      // Removing cache invalidation reduces unnecessary API calls
      
      // Show success toast
      showToast(`Great! ${selectedInterests.length} interests selected. Let's explore sub-categories!`, 'success', 2000);
      
      // ✅ Navigate directly to next step (DB is already updated)
      // Don't call router.refresh() - it causes unnecessary re-renders and delays
      router.replace('/subcategories');
      
      // Reset navigating state after navigation completes
      // Use a timeout as safety in case navigation is delayed
      setTimeout(() => {
        if (isMounted()) {
          setIsNavigating(false);
        }
      }, 1000);
    } catch (error: any) {
      console.error('[useInterestsPage] Unexpected error in handleNext:', error);
      
      // Handle timeout specifically
      if (error?.message?.includes('timeout') || error?.name === 'AbortError') {
        if (isMounted()) {
          showToast('Request timed out. Please check your connection and try again.', 'error', 5000);
          setIsNavigating(false);
        }
        return;
      }

      if (isMounted()) {
        showToast(error?.message || 'Failed to save interests. Please try again.', 'error', 3000);
        setIsNavigating(false);
      }
    }
  }, [selectedInterests, setSelectedInterests, showToast, router, isMounted, withTimeout]);

  // Wrap with double-submit prevention
  const handleNext = preventDoubleSubmit(handleNextInternal);

  // Handle beforeunload warning when saving
  useEffect(() => {
    if (isNavigating) {
      return handleBeforeUnload(isNavigating);
    }
  }, [isNavigating, handleBeforeUnload]);

  // Check if can proceed
  const canProceed = useMemo(() => {
    const validation = validateSelectionCount(selectedInterests, {
      min: MIN_SELECTIONS,
      max: MAX_SELECTIONS,
    }, 'interests');
    return validation.valid && !isNavigating;
  }, [selectedInterests, isNavigating]);

  return {
    interests: INTERESTS,
    selectedInterests,
    isNavigating,
    animatingIds,
    shakingIds,
    canProceed,
    handleToggle,
    handleNext,
    isLoading,
    error,
  };
}

