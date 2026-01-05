"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

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
  isLoading: boolean;
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

  // Start with empty state - no preselected content
  const [selectedInterests, setSelectedInterestsState] = useState<string[]>([]);

  const [selectedSubInterests, setSelectedSubInterestsState] = useState<string[]>([]);
  const [selectedDealbreakers, setSelectedDealbreakerssState] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStep = user?.profile?.onboarding_step || 'interests';

  // Wrapper functions that persist to localStorage
  const setSelectedInterests = useCallback((interests: string[]) => {
    setSelectedInterestsState(interests);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_interests', JSON.stringify(interests));
    }
  }, []);

  const setSelectedSubInterests = useCallback((subcategories: string[]) => {
    setSelectedSubInterestsState(subcategories);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_subcategories', JSON.stringify(subcategories));
    }
  }, []);

  const setSelectedDealbreakers = useCallback((dealbreakers: string[]) => {
    setSelectedDealbreakerssState(dealbreakers);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_dealbreakers', JSON.stringify(dealbreakers));
    }
  }, []);

  const loadInterests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load from catalog API
      const response = await fetch('/api/interests');
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
      showToast(completionMessage, 'success', 3000);

      // Navigate to the next step - NO SAVING until final step
      // Use replace for faster navigation and prefetch for instant loading
      if (nextStepName === 'complete') {
        router.prefetch('/home');
        router.replace('/home');
      } else if (nextStepName === 'subcategories' && currentStep === 'interests') {
        // Pass selected interests as URL params to subcategories
        const interestParams = selectedInterests.length > 0
          ? `?interests=${selectedInterests.join(',')}`
          : '';
        const nextUrl = `/subcategories${interestParams}`;
        router.prefetch(nextUrl);
        router.replace(nextUrl);
      } else {
        const nextUrl = `/${nextStepName}`;
        router.prefetch(nextUrl);
        router.replace(nextUrl);
      }
    } catch (error) {
      console.error('Error proceeding to next step:', error);
      setError('Failed to navigate to next step');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentStep, selectedInterests, showToast, getStepCompletionMessage, router]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    // Prerequisite rule: no interests = no subcategories = no deal-breakers = no complete
    // Bail out early if any prerequisite is missing (don't call API)
    if (!selectedInterests || selectedInterests.length === 0) {
      console.warn('Cannot complete onboarding: interests are required');
      setError('Interests are required to complete onboarding');
      return;
    }

    if (!selectedSubInterests || selectedSubInterests.length === 0) {
      console.warn('Cannot complete onboarding: subcategories are required');
      setError('Subcategories are required to complete onboarding');
      return;
    }

    if (!selectedDealbreakers || selectedDealbreakers.length === 0) {
      console.warn('Cannot complete onboarding: deal-breakers are required');
      setError('Deal-breakers are required to complete onboarding');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use unified onboarding API to save all final data
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'complete',
          interests: selectedInterests,
          subcategories: selectedSubInterests.map(subId => ({
            subcategory_id: subId,
            interest_id: getInterestIdForSubcategory(subId)
          })),
          dealbreakers: selectedDealbreakers
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      // Clear localStorage after successful completion
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_interests');
        localStorage.removeItem('onboarding_subcategories');
        localStorage.removeItem('onboarding_dealbreakers');
      }

      // Show completion toast
      showToast('🎉 Welcome to sayso! Your profile is now complete.', 'success', 4000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setError('Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedInterests, selectedSubInterests, selectedDealbreakers, getInterestIdForSubcategory, showToast]);

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
    isLoading,
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
