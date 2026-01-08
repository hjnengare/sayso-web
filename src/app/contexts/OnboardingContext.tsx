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
  
  // Submit functions (save per step)
  submitInterests: () => Promise<boolean>;
  submitSubcategories: (subcategories?: string[]) => Promise<boolean>;
  submitDealbreakers: () => Promise<boolean>;
  submitComplete: () => Promise<boolean>;
  
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

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
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [subInterests, setSubInterests] = useState<Subcategory[]>([]);

  // State for selections (no localStorage - DB is source of truth)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSubInterests, setSelectedSubInterests] = useState<string[]>([]);
  const [selectedDealbreakers, setSelectedDealbreakers] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStep = user?.profile?.onboarding_step || 'interests';

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
      setSubInterests(subcategories);
      console.log("loaded subInterests", subcategories);
    } catch (error) {
      console.error('Error loading sub-interests:', error);
      setError('Failed to load sub-interests');
      setSubInterests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to get interest_id for a subcategory
  // First checks subInterests (loaded from API), then falls back to a static mapping
  const getInterestIdForSubcategory = useCallback((subcategoryId: string): string => {
    // First try to find in loaded subInterests
    const subcategory = subInterests.find(sub => sub.id === subcategoryId);
    if (subcategory?.interest_id) {
      return subcategory.interest_id;
    }
    
    // Fallback to static mapping (matching the ALL_SUBCATEGORIES in useSubcategoriesPage)
    const staticMapping: Record<string, string> = {
      'restaurants': 'food-drink',
      'cafes': 'food-drink',
      'bars': 'food-drink',
      'fast-food': 'food-drink',
      'fine-dining': 'food-drink',
      'gyms': 'beauty-wellness',
      'spas': 'beauty-wellness',
      'salons': 'beauty-wellness',
      'wellness': 'beauty-wellness',
      'nail-salons': 'beauty-wellness',
      'education-learning': 'professional-services',
      'transport-travel': 'professional-services',
      'finance-insurance': 'professional-services',
      'plumbers': 'professional-services',
      'electricians': 'professional-services',
      'legal-services': 'professional-services',
      'hiking': 'outdoors-adventure',
      'cycling': 'outdoors-adventure',
      'water-sports': 'outdoors-adventure',
      'camping': 'outdoors-adventure',
      'events-festivals': 'experiences-entertainment',
      'sports-recreation': 'experiences-entertainment',
      'nightlife': 'experiences-entertainment',
      'comedy-clubs': 'experiences-entertainment',
      'cinemas': 'experiences-entertainment',
      'museums': 'arts-culture',
      'galleries': 'arts-culture',
      'theaters': 'arts-culture',
      'concerts': 'arts-culture',
      'family-activities': 'family-pets',
      'pet-services': 'family-pets',
      'childcare': 'family-pets',
      'veterinarians': 'family-pets',
      'fashion': 'shopping-lifestyle',
      'electronics': 'shopping-lifestyle',
      'home-decor': 'shopping-lifestyle',
      'books': 'shopping-lifestyle',
    };
    
    return staticMapping[subcategoryId] || '';
  }, [subInterests]);

  /**
   * Submit interests step
   * Saves interests to DB and advances onboarding_step to 'subcategories'
   */
  const submitInterests = useCallback(async (): Promise<boolean> => {
    console.log('[OnboardingContext] submitInterests called', { 
      hasUser: !!user, 
      selectedCount: selectedInterests?.length || 0,
      interests: selectedInterests 
    });

    if (!user) {
      console.error('[OnboardingContext] No user authenticated');
      setError('User not authenticated');
      return false;
    }

    if (!selectedInterests || selectedInterests.length === 0) {
      console.error('[OnboardingContext] No interests selected');
      setError('Please select at least one interest');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[OnboardingContext] Calling API to save interests...');
      const response = await fetch('/api/onboarding/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: selectedInterests
        })
      });

      console.log('[OnboardingContext] API response:', { 
        ok: response.ok, 
        status: response.status,
        statusText: response.statusText 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OnboardingContext] API error:', errorData);
        throw new Error(errorData.error || 'Failed to save interests');
      }

      const data = await response.json();
      console.log('[OnboardingContext] Interests saved successfully:', data);
      
      // Refresh profile before navigation to ensure client state is updated
      if (refreshUser) {
        console.log('[OnboardingContext] Refreshing user profile before navigation...');
        await refreshUser();
        console.log('[OnboardingContext] User profile refreshed');
      }

      // Show toast briefly before navigation
      showToast(`Great! ${selectedInterests.length} interests selected.`, 'success', 1500);
      
      // Wait for toast to be visible, then navigate
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate to next step (use replace to avoid adding to history)
      console.log('[OnboardingContext] Navigating to /subcategories...');
      router.replace('/subcategories');
      
      return true;
    } catch (error: any) {
      console.error('[OnboardingContext] Error submitting interests:', error);
      setError(error.message || 'Failed to save interests');
      showToast(error.message || 'Failed to save interests', 'error', 3000);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedInterests, showToast, router, refreshUser]);

  /**
   * Submit subcategories step
   * Saves subcategories to DB and advances onboarding_step to 'deal-breakers'
   * @param subcategories - Optional array of subcategory IDs. If not provided, uses selectedSubInterests from state.
   */
  const submitSubcategories = useCallback(async (subcategories?: string[]): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    // Use provided subcategories or fall back to state
    const subcategoriesToSubmit = subcategories || selectedSubInterests;

    if (!subcategoriesToSubmit || subcategoriesToSubmit.length === 0) {
      setError('Please select at least one subcategory');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Update state if subcategories were provided
      if (subcategories) {
        setSelectedSubInterests(subcategories);
      }

      // Convert subcategory IDs to {subcategory_id, interest_id} format
      const subcategoryData = subcategoriesToSubmit.map(subId => ({
        subcategory_id: subId,
        interest_id: getInterestIdForSubcategory(subId)
      })).filter(item => item.interest_id); // Filter out any without valid interest_id

      if (subcategoryData.length === 0) {
        setError('Invalid subcategory selections');
        return false;
      }

      const response = await fetch('/api/onboarding/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcategories: subcategoryData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save subcategories');
      }

      const data = await response.json();
      
      // Refresh profile before navigation to ensure client state is updated
      if (refreshUser) {
        console.log('[OnboardingContext] Refreshing user profile before navigation...');
        await refreshUser();
        console.log('[OnboardingContext] User profile refreshed');
      }

      showToast(`Perfect! ${subcategoriesToSubmit.length} subcategories added.`, 'success', 3000);
      
      // Navigate to next step (use replace to avoid adding to history)
      router.replace('/deal-breakers');
      
      return true;
    } catch (error: any) {
      console.error('Error submitting subcategories:', error);
      setError(error.message || 'Failed to save subcategories');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedSubInterests, getInterestIdForSubcategory, showToast, router, refreshUser]);

  /**
   * Submit deal-breakers step
   * Saves dealbreakers to DB and advances onboarding_step to 'complete'
   */
  const submitDealbreakers = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    if (!selectedDealbreakers || selectedDealbreakers.length === 0) {
      setError('Please select at least one deal-breaker');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/onboarding/deal-breakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealbreakers: selectedDealbreakers
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save dealbreakers');
      }

      const data = await response.json();
      
      // Refresh profile before navigation to ensure client state is updated
      if (refreshUser) {
        console.log('[OnboardingContext] Refreshing user profile before navigation...');
        await refreshUser();
        console.log('[OnboardingContext] User profile refreshed');
      }

      showToast(`Excellent! ${selectedDealbreakers.length} dealbreakers set.`, 'success', 3000);
      
      // Navigate to complete step (use replace to avoid adding to history)
      router.replace('/complete');
      
      return true;
    } catch (error: any) {
      console.error('Error submitting dealbreakers:', error);
      setError(error.message || 'Failed to save dealbreakers');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedDealbreakers, showToast, router, refreshUser]);

  /**
   * Submit complete step
   * Marks onboarding_complete=true (data already saved at each step)
   */
  const submitComplete = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // No data needed - just mark complete
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }

      // Refresh profile before navigation to ensure client state is updated
      if (refreshUser) {
        console.log('[OnboardingContext] Refreshing user profile before navigation...');
        await refreshUser();
        console.log('[OnboardingContext] User profile refreshed');
      }

      showToast('🎉 Welcome to sayso! Your profile is now complete.', 'success', 4000);
      
      // Navigate to home (use replace to avoid adding to history)
      router.replace('/home');
      
      return true;
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      setError(error.message || 'Failed to complete onboarding');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast, router, refreshUser]);

  const resetOnboarding = useCallback(() => {
    setSelectedInterests([]);
    setSelectedSubInterests([]);
    setSelectedDealbreakers([]);
    setError(null);
    // No localStorage to clear
  }, []);

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
    
    // Submit functions
    submitInterests,
    submitSubcategories,
    submitDealbreakers,
    submitComplete,
    
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
