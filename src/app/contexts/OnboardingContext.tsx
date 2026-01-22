"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

// Utility: Debounce localStorage writes for mobile performance
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Mobile detection for performance optimizations
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

interface Interest {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

interface Subcategory {
  id: string;
  label: string;
  interest_id: string;
}

interface OnboardingContextType {
  // Data
  interests: Interest[];
  subInterests: Subcategory[];
  selectedInterests: string[];
  selectedSubInterests: string[];
  selectedDealbreakers: string[];

  // State
  error: string | null;
  currentStep: string;

  // Actions
  loadInterests: () => Promise<void>;
  loadSubInterests: (parentIds?: string[]) => Promise<void>;
  setSelectedInterests: (interests: string[]) => void;
  setSelectedSubInterests: (subInterests: string[]) => void;
  setSelectedDealbreakers: (dealbreakers: string[]) => void;
  nextStep: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

const ONBOARDING_STEPS = [
  'interests',
  'subcategories',
  'deal-breakers',
  'complete'
];

// Fallback data in case API fails
const FALLBACK_INTERESTS: Interest[] = [
  { id: 'food-drink', name: 'Food & Drink', description: 'Restaurants, cafes, and culinary experiences', icon: 'restaurant' },
  { id: 'beauty-wellness', name: 'Beauty & Wellness', description: 'Gyms, spas, and personal care services', icon: 'cut' },
  { id: 'professional-services', name: 'Professional Services', description: 'Home improvement and professional services', icon: 'home' },
  { id: 'outdoors-adventure', name: 'Outdoors & Adventure', description: 'Outdoor activities and adventures', icon: 'bicycle' },
  { id: 'experiences-entertainment', name: 'Entertainment & Experiences', description: 'Movies, shows, and nightlife', icon: 'musical-notes' },
  { id: 'arts-culture', name: 'Arts & Culture', description: 'Museums, galleries, and cultural experiences', icon: 'color-palette' },
  { id: 'family-pets', name: 'Family & Pets', description: 'Family activities and pet services', icon: 'heart' },
  { id: 'shopping-lifestyle', name: 'Shopping & Lifestyle', description: 'Retail stores and lifestyle services', icon: 'bag' }
];

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [subInterests, setSubInterests] = useState<Subcategory[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize with empty arrays to prevent hydration mismatch
  // localStorage will be loaded in useEffect after hydration
  const [selectedInterests, setSelectedInterestsState] = useState<string[]>([]);
  const [selectedSubInterests, setSelectedSubInterestsState] = useState<string[]>([]);
  const [selectedDealbreakers, setSelectedDealbreakerssState] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false); // Internal loading state for API calls
  const [error, setError] = useState<string | null>(null);

  const currentStep = user?.profile?.onboarding_step || 'interests';

  // Consolidated initialization: Clear stale data + Load localStorage in single pass
  useEffect(() => {
    if (typeof window === 'undefined' || isMounted) return;

    // Single-pass initialization for better mobile performance
    const initializeOnboarding = () => {
      let shouldLoadStorage = true;

      // Check if we need to clear stale data for brand new users
      if (user) {
        const onboardingStep = user.profile?.onboarding_step;
        const isStartingFresh = !onboardingStep || onboardingStep === 'interests';
        const isOnboardingIncomplete = !user.profile?.onboarding_complete;

        if (isStartingFresh && isOnboardingIncomplete) {
          const hasNoDatabaseData = 
            (user.profile?.interests_count || 0) === 0 &&
            (user.profile?.subcategories_count || 0) === 0 &&
            (user.profile?.dealbreakers_count || 0) === 0;

          const hasStoredData =
            localStorage.getItem('onboarding_interests') ||
            localStorage.getItem('onboarding_subcategories') ||
            localStorage.getItem('onboarding_dealbreakers');

          // If brand new user with stored data, it's stale - clear it
          if (hasNoDatabaseData && hasStoredData) {
            console.log('[OnboardingContext] Clearing stale localStorage for brand new user');
            localStorage.removeItem('onboarding_interests');
            localStorage.removeItem('onboarding_subcategories');
            localStorage.removeItem('onboarding_dealbreakers');
            shouldLoadStorage = false;
          }
        }
      }

      // Load from localStorage if not cleared
      if (shouldLoadStorage) {
        try {
          const stored = {
            interests: localStorage.getItem('onboarding_interests'),
            subcategories: localStorage.getItem('onboarding_subcategories'),
            dealbreakers: localStorage.getItem('onboarding_dealbreakers'),
          };

          if (stored.interests) setSelectedInterestsState(JSON.parse(stored.interests));
          if (stored.subcategories) setSelectedSubInterestsState(JSON.parse(stored.subcategories));
          if (stored.dealbreakers) setSelectedDealbreakerssState(JSON.parse(stored.dealbreakers));
        } catch (e) {
          console.error('[OnboardingContext] Failed to parse stored data:', e);
        }
      }

      setIsMounted(true);
    };

    initializeOnboarding();
  }, [user, isMounted]);

  // Debounced localStorage save for mobile performance (300ms)
  const debouncedSaveRef = useRef(
    debounce((key: string, value: string) => {
      if (typeof window !== 'undefined') {
        // Use requestIdleCallback for even better mobile performance
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            localStorage.setItem(key, value);
          }, { timeout: 1000 });
        } else {
          localStorage.setItem(key, value);
        }
      }
    }, 300)
  );

  // Wrapper functions that persist to localStorage (optimized for mobile)
  const setSelectedInterests = useCallback((interests: string[]) => {
    setSelectedInterestsState(interests);
    debouncedSaveRef.current('onboarding_interests', JSON.stringify(interests));
  }, []);

  const setSelectedSubInterests = useCallback((subcategories: string[]) => {
    setSelectedSubInterestsState(subcategories);
    debouncedSaveRef.current('onboarding_subcategories', JSON.stringify(subcategories));
  }, []);

  const setSelectedDealbreakers = useCallback((dealbreakers: string[]) => {
    setSelectedDealbreakerssState(dealbreakers);
    debouncedSaveRef.current('onboarding_dealbreakers', JSON.stringify(dealbreakers));
  }, []);

  const loadInterests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load from catalog API - no cache for fresh data
      const response = await fetch('/api/interests', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.interests && Array.isArray(data.interests)) {
          setInterests(data.interests);
          return;
        }
      }

      // Fallback to static data if API fails
      console.warn('Interests API failed, using fallback data');
      setInterests(FALLBACK_INTERESTS);
    } catch (error) {
      console.error('Error loading interests:', error);
      setError('Failed to load interests');
      // Use fallback data even on error
      setInterests(FALLBACK_INTERESTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSubInterests = useCallback(async (interestIds: string[]) => {
    try {
      setIsLoading(true);
      setError(null);

      const qs = interestIds.length ? `?interests=${interestIds.join(",")}` : "";
      const res = await fetch(`/api/subcategories${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load subcategories");
      const { subcategories } = await res.json();

      // Set subcategories directly - they should be {id,label,interest_id}
      // Guard: ensure subcategories is always an array
      setSubInterests(Array.isArray(subcategories) ? subcategories : []);
      console.log("loaded subInterests", subcategories);
    } catch (error) {
      console.error('Error loading sub-interests:', error);
      setError('Failed to load sub-interests');
      setSubInterests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getNextStep = (current: string): string => {
    const currentIndex = ONBOARDING_STEPS.indexOf(current);
    if (currentIndex === -1 || currentIndex === ONBOARDING_STEPS.length - 1) {
      return 'complete';
    }
    return ONBOARDING_STEPS[currentIndex + 1];
  };

  const getStepCompletionMessage = useCallback((step: string): string => {
    switch (step) {
      case 'interests':
        return `Great! ${selectedInterests.length} interests selected. Let's explore sub-categories!`;
      case 'subcategories':
        return `Perfect! ${selectedSubInterests.length} sub-interests added. Now let's set your dealbreakers.`;
      case 'deal-breakers':
        return `Excellent! ${selectedDealbreakers.length} dealbreakers set. Almost done!`;
      default:
        return 'Step completed successfully!';
    }
  }, [selectedInterests.length, selectedSubInterests.length, selectedDealbreakers.length]);

  // Helper function to get interest_id for a subcategory
  const getInterestIdForSubcategory = useCallback((subcategoryId: string): string => {
    const subcategory = subInterests.find(sub => sub.id === subcategoryId);
    return subcategory?.interest_id || '';
  }, [subInterests]);

  const nextStep = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const nextStepName = getNextStep(currentStep);

      // Show success toast for step completion
      const completionMessage = getStepCompletionMessage(currentStep);
      showToast(completionMessage, 'success', 2000);

      // Conditional prefetching: Only on desktop or good connections
      const shouldPrefetch = !isMobileDevice() || 
        (typeof navigator !== 'undefined' && 
         (navigator as any).connection?.effectiveType === '4g');
      
      if (shouldPrefetch) {
        // Prefetch all next onboarding pages early for instant navigation
        const allNextRoutes = ['/subcategories', '/deal-breakers', '/complete'];
        allNextRoutes.forEach(route => router.prefetch(route));
      }

      // Navigate immediately (no delay) - prefetching makes it instant
      // Use exact step-to-route mapping to ensure correct navigation
      const STEP_TO_ROUTE: Record<string, string> = {
        'interests': '/interests',
        'subcategories': '/subcategories',
        'deal-breakers': '/deal-breakers',
        'complete': '/complete',
      };
      
      if (nextStepName === 'subcategories' && currentStep === 'interests') {
        // Pass selected interests as URL params to subcategories
        const interestParams = selectedInterests.length > 0
          ? `?interests=${selectedInterests.join(',')}`
          : '';
        const nextUrl = `/subcategories${interestParams}`;
        router.replace(nextUrl);
      } else {
        const nextUrl = STEP_TO_ROUTE[nextStepName] || `/${nextStepName}`;
        router.replace(nextUrl);
      }
      // Don't call router.refresh() - it causes unnecessary re-renders
    } catch (error) {
      console.error('Error proceeding to next step:', error);
      setError('Failed to navigate to next step');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentStep, selectedInterests, showToast, getStepCompletionMessage, router]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Mark onboarding as complete
      // Note: Interests, subcategories, and dealbreakers were already saved in previous steps
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      let payload: any = null;
      try { payload = await response.json(); } catch {}

      if (response.status === 401) {
        setError('Your session expired. Please log in again.');
        showToast('Your session expired. Please log in again.', 'warning', 3000);
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        const errorMsg = payload?.error || payload?.message || 'Failed to complete onboarding';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Update AuthContext with the completed onboarding status
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
        } catch (updateError) {
          console.warn('Failed to update user profile:', updateError);
          // Continue anyway - the DB is updated
        }
      }

      // Clear localStorage after successful completion
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_interests');
        localStorage.removeItem('onboarding_subcategories');
        localStorage.removeItem('onboarding_dealbreakers');
      }

      // Show completion toast
      showToast('🎉 Welcome to sayso! Your profile is now complete.', 'success', 4000);

      // Navigate to home
      router.replace('/home');
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      const errorMsg = error?.message || 'Failed to complete onboarding';
      setError(errorMsg);
      showToast(errorMsg, 'error', 3000);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedInterests, selectedSubInterests, selectedDealbreakers, getInterestIdForSubcategory, showToast, router, updateUser]);

  const resetOnboarding = useCallback(() => {
    setSelectedInterests([]);
    setSelectedSubInterests([]);
    setSelectedDealbreakers([]);
    setError(null);
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboarding_interests');
      localStorage.removeItem('onboarding_subcategories');
      localStorage.removeItem('onboarding_dealbreakers');
    }
  }, [setSelectedInterests, setSelectedSubInterests, setSelectedDealbreakers]);

  const value: OnboardingContextType = {
    // Data
    interests,
    subInterests,
    selectedInterests,
    selectedSubInterests,
    selectedDealbreakers,

    // State
    error,
    currentStep,

    // Actions
    loadInterests,
    loadSubInterests,
    setSelectedInterests,
    setSelectedSubInterests,
    setSelectedDealbreakers,
    nextStep,
    completeOnboarding,
    resetOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
