/**
 * useDealBreakersPage Hook
 *
 * This hook handles the final step of onboarding.
 * When user clicks "Continue", it calls the ATOMIC completion API
 * which saves ALL onboarding data (interests, subcategories, dealbreakers)
 * in a SINGLE database transaction.
 *
 * This ensures no partial saves that can leave users in inconsistent states.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  const onboarding = useOnboarding();
  const {
    selectedDealbreakers,
    setSelectedDealbreakers,
    selectedInterests,
    selectedSubInterests,
    error: contextError
  } = onboarding;

  // Keep a ref to access latest values in callbacks
  const onboardingRef = useRef({ selectedInterests, selectedSubInterests });
  useEffect(() => {
    onboardingRef.current = { selectedInterests, selectedSubInterests };
  }, [selectedInterests, selectedSubInterests]);

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
          showToast(`Max ${MAX_SELECTIONS} selected`, 'sage', 2000);
          return;
        }
        setSelectedDealbreakers([...selectedDealbreakers, dealbreakerId]);
      }
    },
    [selectedDealbreakers, setSelectedDealbreakers, showToast]
  );

  // Handle next navigation - ATOMIC completion of ALL onboarding data
  const handleNext = useCallback(async () => {
    if (selectedDealbreakers.length === 0) {
      showToast('Select at least one', 'sage', 2000);
      return;
    }

    setIsNavigating(true);

    try {
      // Get all onboarding data from context (localStorage)
      const { selectedInterests, selectedSubInterests } = onboardingRef.current;

      // Validate we have all required data
      if (!selectedInterests || selectedInterests.length < 3) {
        throw new Error('Please complete your interests selection first');
      }
      if (!selectedSubInterests || selectedSubInterests.length < 1) {
        throw new Error('Please complete your subcategories selection first');
      }

      // Call the ATOMIC completion API
      // This saves ALL data in a single database transaction
      const response = await fetch('/api/onboarding/complete-atomic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          interests: selectedInterests,
          subcategories: selectedSubInterests,
          dealbreakers: selectedDealbreakers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to complete onboarding');
      }

      // Clear localStorage after successful atomic completion
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_interests');
        localStorage.removeItem('onboarding_subcategories');
        localStorage.removeItem('onboarding_dealbreakers');
      }

      // Navigate to celebration page
      router.replace('/complete');
    } catch (error) {
      console.error('[Deal-breakers] Error completing onboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding';
      showToast(errorMessage, 'sage', 4000);
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
