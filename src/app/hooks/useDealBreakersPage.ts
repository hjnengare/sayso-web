/**
 * useDealBreakersPage Hook (Simplified - localStorage only)
 * Encapsulates all logic for the deal-breakers page without DB calls
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useToast } from '../contexts/ToastContext';

interface DealBreaker {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const DEMO_DEAL_BREAKERS: DealBreaker[] = [
  { id: 'trustworthiness', label: 'Trustworthiness', description: 'Reliable and honest service', icon: 'shield-checkmark' },
  { id: 'punctuality', label: 'Punctuality', description: 'On-time and respects your schedule', icon: 'time' },
  { id: 'friendliness', label: 'Friendliness', description: 'Welcoming and helpful staff', icon: 'happy' },
  { id: 'value-for-money', label: 'Value for Money', description: 'Fair pricing and good quality', icon: 'cash-outline' },
];

const MAX_SELECTIONS = 3;

export interface UseDealBreakersPageReturn {
  dealbreakers: typeof DEMO_DEAL_BREAKERS;
  selectedDealbreakers: string[];
  isNavigating: boolean;
  canProceed: boolean;
  handleToggle: (dealbreakerId: string) => void;
  handleNext: () => void;
  error: Error | null;
}

export function useDealBreakersPage(): UseDealBreakersPageReturn {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    selectedDealbreakers,
    setSelectedDealbreakers,
    error: contextError
  } = useOnboarding();

  const [isNavigating, setIsNavigating] = useState(false);

  const error: Error | null = contextError ? new Error(contextError) : null;

  // Early prefetching
  useEffect(() => {
    router.prefetch('/complete');
    router.prefetch('/home');
  }, [router]);

  // Handle dealbreaker toggle
  const handleToggle = useCallback(
    (dealbreakerId: string) => {
      const isSelected = selectedDealbreakers.includes(dealbreakerId);

      if (isSelected) {
        setSelectedDealbreakers(selectedDealbreakers.filter((id) => id !== dealbreakerId));
      } else {
        if (selectedDealbreakers.length >= MAX_SELECTIONS) {
          showToast(`Maximum ${MAX_SELECTIONS} deal-breakers allowed`, 'warning', 2000);
          return;
        }
        setSelectedDealbreakers([...selectedDealbreakers, dealbreakerId]);
      }
    },
    [selectedDealbreakers, setSelectedDealbreakers, showToast]
  );

  // Handle next navigation - save to DB and navigate
  const handleNext = useCallback(async () => {
    if (selectedDealbreakers.length === 0) {
      showToast('Please select at least one deal-breaker', 'warning', 2000);
      return;
    }

    setIsNavigating(true);

    try {
      // Save dealbreakers to database
      const response = await fetch('/api/onboarding/deal-breakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealbreakers: selectedDealbreakers }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save deal-breakers');
      }

      // Navigate immediately - no toast needed since navigation is the success indicator
      // The toast was appearing on the next page due to timing issues
      router.replace('/complete');
    } catch (error) {
      console.error('[Deal-breakers] Error saving:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save deal-breakers';
      showToast(errorMessage, 'error', 4000);
      setIsNavigating(false);
    }
  }, [selectedDealbreakers, showToast, router]);

  // Check if can proceed
  const canProceed = useMemo(() => {
    return selectedDealbreakers.length > 0 && !isNavigating;
  }, [selectedDealbreakers.length, isNavigating]);

  return {
    dealbreakers: DEMO_DEAL_BREAKERS,
    selectedDealbreakers,
    isNavigating,
    canProceed,
    handleToggle,
    handleNext,
    error,
  };
}
