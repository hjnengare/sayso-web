/**
 * useInterestsPage Hook (Simplified - localStorage only)
 * Encapsulates all logic for the interests page without DB calls
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useToast } from '../contexts/ToastContext';

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
  const {
    selectedInterests,
    setSelectedInterests,
    isLoading: contextLoading,
    error: contextError
  } = useOnboarding();

  const [isNavigating, setIsNavigating] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [shakingIds, setShakingIds] = useState<Set<string>>(new Set());
  const hasPrefetchedRef = useRef(false);

  const isLoading = contextLoading;
  const error: Error | null = contextError ? new Error(contextError) : null;

  // Early prefetching of all onboarding pages for instant navigation
  useEffect(() => {
    router.prefetch('/subcategories');
    router.prefetch('/deal-breakers');
    router.prefetch('/complete');
  }, [router]);

  // Additional prefetch when minimum reached
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
      const isCurrentlySelected = selectedInterests.includes(interestId);
      triggerBounce(interestId);

      // Check max selections
      if (!isCurrentlySelected && selectedInterests.length >= MAX_SELECTIONS) {
        showToast(`Maximum ${MAX_SELECTIONS} interests allowed`, 'warning', 2000);
        triggerShake(interestId);
        return;
      }

      // Toggle selection (saves to localStorage automatically)
      const newSelection = isCurrentlySelected
        ? selectedInterests.filter((id) => id !== interestId)
        : [...selectedInterests, interestId];

      setSelectedInterests(newSelection);

      // Show feedback
      if (!isCurrentlySelected) {
        if (newSelection.length === MIN_SELECTIONS) {
          showToast('🎉 Great! You can continue now', 'sage', 2000);
        } else if (newSelection.length === MAX_SELECTIONS) {
          showToast('✨ Perfect selection!', 'sage', 2000);
        }
      }
    },
    [selectedInterests, setSelectedInterests, showToast, triggerBounce, triggerShake]
  );

  // Handle next navigation (just navigate, no API call)
  const handleNext = useCallback(() => {
    // Validate selections
    if (selectedInterests.length < MIN_SELECTIONS) {
      showToast(`Please select at least ${MIN_SELECTIONS} interests`, 'warning', 3000);
      return;
    }

    if (selectedInterests.length > MAX_SELECTIONS) {
      showToast(`Please select no more than ${MAX_SELECTIONS} interests`, 'warning', 3000);
      return;
    }

    setIsNavigating(true);

    // Show success toast
    showToast(`Great! ${selectedInterests.length} interests selected. Let's explore sub-categories!`, 'success', 2000);

    // Navigate to subcategories
    router.replace('/subcategories');

    // Reset navigating state
    setTimeout(() => {
      setIsNavigating(false);
    }, 1000);
  }, [selectedInterests, showToast, router]);

  // Check if can proceed
  const canProceed = useMemo(() => {
    return selectedInterests.length >= MIN_SELECTIONS &&
           selectedInterests.length <= MAX_SELECTIONS &&
           !isNavigating;
  }, [selectedInterests.length, isNavigating]);

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
