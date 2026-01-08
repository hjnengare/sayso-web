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
  const { submitInterests, setSelectedInterests, isLoading: contextLoading, error: contextError } = useOnboarding();
  const [isNavigating, setIsNavigating] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [shakingIds, setShakingIds] = useState<Set<string>>(new Set());
  const hasPrefetchedRef = useRef(false);

  const {
    data,
    isLoading: dataLoading,
    error: dataError,
    updateInterests,
  } = useOnboardingData({
    loadFromDatabase: true,
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

  // Prefetch next page
  useEffect(() => {
    router.prefetch('/subcategories');
  }, [router]);

  // Prefetch when minimum reached
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
  const handleNext = useCallback(async () => {
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

    console.log('[useInterestsPage] Validation passed, setting navigating state...');
    setIsNavigating(true);

    try {
      // Ensure OnboardingContext has latest selections
      console.log('[useInterestsPage] Syncing selections to context...');
      setSelectedInterests(selectedInterests);
      
      // Submit to API (saves to DB and advances onboarding_step)
      console.log('[useInterestsPage] Calling submitInterests...');
      const success = await submitInterests();
      
      console.log('[useInterestsPage] submitInterests result:', success);
      
      if (!success) {
        console.error('[useInterestsPage] Submit failed, resetting navigating state');
        setIsNavigating(false);
        // Error already set in context
        return;
      }
      
      console.log('[useInterestsPage] Submit successful, navigation should happen in submitInterests');
      // Navigation happens in submitInterests, but we can also let middleware handle it
      // setIsNavigating will be reset on unmount
    } catch (error) {
      console.error('[useInterestsPage] Unexpected error in handleNext:', error);
      showToast('Failed to save interests. Please try again.', 'error', 3000);
      setIsNavigating(false);
    }
  }, [selectedInterests, submitInterests, setSelectedInterests, showToast]);

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

