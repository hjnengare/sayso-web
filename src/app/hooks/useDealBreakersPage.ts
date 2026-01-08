/**
 * useDealBreakersPage Hook
 * Encapsulates all logic for the deal-breakers page
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingData } from './useOnboardingData';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useToast } from '../contexts/ToastContext';
import { validateSelectionCount } from '../lib/onboarding/validation';

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
  isLoading: boolean;
  error: Error | null;
}

export function useDealBreakersPage(): UseDealBreakersPageReturn {
  const router = useRouter();
  const { showToast } = useToast();
  const { setSelectedDealbreakers, nextStep, isLoading: contextLoading, error: contextError } = useOnboarding();
  const [isNavigating, setIsNavigating] = useState(false);

  const {
    data,
    isLoading: dataLoading,
    error: dataError,
    updateDealbreakers,
  } = useOnboardingData({
    loadFromDatabase: true,
  });

  const selectedDealbreakers = data.dealbreakers;
  const selectedInterests = data.interests;
  const selectedSubcategories = data.subcategories;
  
  // Sync OnboardingContext with useOnboardingData
  useEffect(() => {
    if (selectedDealbreakers.length > 0) {
      setSelectedDealbreakers(selectedDealbreakers);
    }
  }, [selectedDealbreakers, setSelectedDealbreakers]);
  
  const isLoading = dataLoading || contextLoading;
  // Convert string error from context to Error object if needed
  const error: Error | null = dataError || (contextError ? new Error(contextError) : null);

  // Note: Middleware handles routing - if user is not at correct step, they'll be redirected
  // We just ensure we have data loaded from DB

  // Prefetch complete page
  useEffect(() => {
    router.prefetch('/complete');
  }, [router]);

  // Handle dealbreaker toggle
  const handleToggle = useCallback(
    (dealbreakerId: string) => {
      const isSelected = selectedDealbreakers.includes(dealbreakerId);

      if (isSelected) {
        updateDealbreakers(selectedDealbreakers.filter((id) => id !== dealbreakerId));
      } else {
        if (selectedDealbreakers.length >= MAX_SELECTIONS) {
          showToast(`Maximum ${MAX_SELECTIONS} deal-breakers allowed`, 'warning', 2000);
          return;
        }
        updateDealbreakers([...selectedDealbreakers, dealbreakerId]);
      }
    },
    [selectedDealbreakers, updateDealbreakers, showToast]
  );

  // Handle next navigation - saves to DB and advances step
  const handleNext = useCallback(async () => {
    // Validate selections
    const validation = validateSelectionCount(selectedDealbreakers, {
      min: 1,
      max: MAX_SELECTIONS,
    }, 'deal-breakers');

    if (!validation.valid) {
      validation.errors.forEach((error) => showToast(error, 'warning', 3000));
      return;
    }

    setIsNavigating(true);

    try {
      // Ensure OnboardingContext has latest selections
      setSelectedDealbreakers(selectedDealbreakers);
      
      // Save to API
      const response = await fetch('/api/onboarding/deal-breakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dealbreakers: selectedDealbreakers
        })
      });

      let payload: any = null;
      try { payload = await response.json(); } catch {}

      if (response.status === 401) {
        showToast('Your session expired. Please log in again.', 'warning', 3000);
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const msg = payload?.error || payload?.message || 'Failed to save dealbreakers';
        throw new Error(msg);
      }

      // Navigate to next step
      await nextStep();
    } catch (error: any) {
      console.error('[Deal-breakers] Submit error:', error);
      showToast(error?.message || 'Failed to save dealbreakers. Please try again.', 'error', 3000);
      setIsNavigating(false);
    }
  }, [selectedDealbreakers, setSelectedDealbreakers, nextStep, showToast, router]);

  // Check if can proceed
  const canProceed = useMemo(() => {
    const validation = validateSelectionCount(selectedDealbreakers, {
      min: 1,
      max: MAX_SELECTIONS,
    }, 'deal-breakers');
    return validation.valid && !isNavigating;
  }, [selectedDealbreakers, isNavigating]);

  return {
    dealbreakers: DEMO_DEAL_BREAKERS,
    selectedDealbreakers,
    isNavigating,
    canProceed,
    handleToggle,
    handleNext,
    isLoading,
    error,
  };
}

