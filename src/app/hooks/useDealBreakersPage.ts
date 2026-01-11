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
import { useOnboardingSafety } from './useOnboardingSafety';
import { apiClient } from '../lib/api/apiClient';
import { useAuth } from '../contexts/AuthContext';

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
  const { setSelectedDealbreakers, isLoading: contextLoading, error: contextError } = useOnboarding();
  const { updateUser } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);
  
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
    updateDealbreakers,
    refresh: refreshOnboardingData,
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

  // Load data only once on mount - useOnboardingData already handles loading
  // Avoid unnecessary cache invalidation that causes redundant API calls
  // Data is loaded by useOnboardingData hook automatically

  // Early prefetching of complete page for instant navigation
  useEffect(() => {
    router.prefetch('/complete');
    router.prefetch('/home'); // Also prefetch home for after completion
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
  const handleNextInternal = useCallback(async () => {
    // Validate selections
    const validation = validateSelectionCount(selectedDealbreakers, {
      min: 1,
      max: MAX_SELECTIONS,
    }, 'deal-breakers');

    if (!validation.valid) {
      validation.errors.forEach((error) => showToast(error, 'warning', 3000));
      return;
    }

    // Safe state update (only if mounted)
    if (!isMounted()) return;
    setIsNavigating(true);

    try {
      // Ensure OnboardingContext has latest selections
      if (!isMounted()) return;
      setSelectedDealbreakers(selectedDealbreakers);
      
      // Save to API with timeout
      const fetchPromise = fetch('/api/onboarding/deal-breakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store', // Ensure fresh data
        body: JSON.stringify({
          dealbreakers: selectedDealbreakers
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
        const msg = payload?.error || payload?.message || 'Failed to save dealbreakers';
        throw new Error(msg);
      }

      console.log('[useDealBreakersPage] Save successful, updating user profile from API response...');

      // CRITICAL FIX: Update AuthContext directly with state from API response
      // This eliminates race condition from separate refreshUser() query
      if (payload && typeof payload === 'object') {
        try {
          await updateUser({
            profile: {
              onboarding_step: payload.onboarding_step,
              onboarding_complete: payload.onboarding_complete,
              interests_count: payload.interests_count,
              subcategories_count: payload.subcategories_count,
              dealbreakers_count: payload.dealbreakers_count,
            } as any
          });
          console.log('[useDealBreakersPage] User profile updated from API response:', {
            onboarding_step: payload.onboarding_step,
            onboarding_complete: payload.onboarding_complete,
            dealbreakers_count: payload.dealbreakers_count,
          });
        } catch (updateError) {
          console.warn('[useDealBreakersPage] Failed to update user profile:', updateError);
          // Continue anyway - the DB is updated, navigation should work
        }
      }

      // Show success toast
      showToast(`Excellent! ${selectedDealbreakers.length} dealbreakers set. Almost done!`, 'success', 2000);

      // ✅ Navigate directly to next step (DB is already updated, profile is refreshed)
      // Use replace instead of push to prevent back button issues
      router.replace('/complete');

      // Reset navigating state after navigation completes
      setTimeout(() => {
        if (isMounted()) {
          setIsNavigating(false);
        }
      }, 1000);
    } catch (error: any) {
      console.error('[Deal-breakers] Submit error:', error);
      
      // Handle timeout specifically
      if (error?.message?.includes('timeout') || error?.name === 'AbortError') {
        if (isMounted()) {
          showToast('Request timed out. Please check your connection and try again.', 'error', 5000);
          setIsNavigating(false);
        }
        return;
      }

      if (isMounted()) {
        showToast(error?.message || 'Failed to save dealbreakers. Please try again.', 'error', 3000);
        setIsNavigating(false);
      }
    }
  }, [selectedDealbreakers, setSelectedDealbreakers, showToast, router, isMounted, withTimeout]);

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

