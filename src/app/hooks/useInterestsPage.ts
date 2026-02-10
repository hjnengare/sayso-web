/**
 * useInterestsPage Hook
 * Encapsulates all logic for the interests page
 * Saves selections to DB when clicking next to advance onboarding_step
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useToast } from '../contexts/ToastContext';

const INTERESTS: Array<{ id: string; name: string }> = [
  { id: 'food-drink', name: 'Food & Drink' },
  { id: 'beauty-wellness', name: 'Beauty & Wellness' },
  { id: 'professional-services', name: 'Professional Services' },
  { id: 'travel', name: 'Travel' },
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
  error: Error | null;
}

export function useInterestsPage(): UseInterestsPageReturn {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    selectedInterests,
    setSelectedInterests,
    error: contextError
  } = useOnboarding();

  const [isNavigating, setIsNavigating] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [shakingIds, setShakingIds] = useState<Set<string>>(new Set());
  const hasPrefetchedRef = useRef(false);

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
        showToast(`Max ${MAX_SELECTIONS} selected`, 'sage', 2000);
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
          showToast('Ready to continue', 'sage', 2000);
        } else if (newSelection.length === MAX_SELECTIONS) {
          showToast('Perfect selection', 'sage', 2000);
        }
      }
    },
    [selectedInterests, setSelectedInterests, showToast, triggerBounce, triggerShake]
  );

  // Handle next navigation - save to DB and navigate
  const handleNext = useCallback(async () => {
    // Validate selections
    if (selectedInterests.length < MIN_SELECTIONS) {
      showToast(`Min ${MIN_SELECTIONS} required`, 'sage', 3000);
      return;
    }

    if (selectedInterests.length > MAX_SELECTIONS) {
      showToast(`Max ${MAX_SELECTIONS} allowed`, 'sage', 3000);
      return;
    }

    setIsNavigating(true);

    try {
      // Save interests to database
      const response = await fetch('/api/onboarding/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ interests: selectedInterests }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save interests');
      }

      // Navigate immediately - no toast needed since navigation is the success indicator
      // The toast was appearing on the next page due to timing issues
      router.replace('/subcategories');
    } catch (error) {
      console.error('[Interests] Error saving:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save interests';
      showToast(errorMessage, 'sage', 4000);
      setIsNavigating(false);
    }
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
    error,
  };
}
