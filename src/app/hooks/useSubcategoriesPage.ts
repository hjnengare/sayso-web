/**
 * useSubcategoriesPage Hook
 * Encapsulates all logic for the subcategories page
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingData } from './useOnboardingData';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useToast } from '../contexts/ToastContext';
import { useOnboardingSafety } from './useOnboardingSafety';
import { apiClient } from '../lib/api/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface SubcategoryItem {
  id: string;
  label: string;
  interest_id: string;
}

const INTEREST_TITLES: { [key: string]: string } = {
  'food-drink': 'Food & Drink',
  'beauty-wellness': 'Beauty & Wellness',
  'professional-services': 'Professional Services',
  'outdoors-adventure': 'Outdoors & Adventure',
  'experiences-entertainment': 'Entertainment & Experiences',
  'arts-culture': 'Arts & Culture',
  'family-pets': 'Family & Pets',
  'shopping-lifestyle': 'Shopping & Lifestyle',
};

const ALL_SUBCATEGORIES: SubcategoryItem[] = [
  // Food & Drink
  { id: 'restaurants', label: 'Restaurants', interest_id: 'food-drink' },
  { id: 'cafes', label: 'Cafés & Coffee', interest_id: 'food-drink' },
  { id: 'bars', label: 'Bars & Pubs', interest_id: 'food-drink' },
  { id: 'fast-food', label: 'Fast Food', interest_id: 'food-drink' },
  { id: 'fine-dining', label: 'Fine Dining', interest_id: 'food-drink' },
  // Beauty & Wellness
  { id: 'gyms', label: 'Gyms & Fitness', interest_id: 'beauty-wellness' },
  { id: 'spas', label: 'Spas', interest_id: 'beauty-wellness' },
  { id: 'salons', label: 'Hair Salons', interest_id: 'beauty-wellness' },
  { id: 'wellness', label: 'Wellness Centers', interest_id: 'beauty-wellness' },
  { id: 'nail-salons', label: 'Nail Salons', interest_id: 'beauty-wellness' },
  // Professional Services
  { id: 'education-learning', label: 'Education & Learning', interest_id: 'professional-services' },
  { id: 'transport-travel', label: 'Transport & Travel', interest_id: 'professional-services' },
  { id: 'finance-insurance', label: 'Finance & Insurance', interest_id: 'professional-services' },
  { id: 'plumbers', label: 'Plumbers', interest_id: 'professional-services' },
  { id: 'electricians', label: 'Electricians', interest_id: 'professional-services' },
  { id: 'legal-services', label: 'Legal Services', interest_id: 'professional-services' },
  // Outdoors & Adventure
  { id: 'hiking', label: 'Hiking', interest_id: 'outdoors-adventure' },
  { id: 'cycling', label: 'Cycling', interest_id: 'outdoors-adventure' },
  { id: 'water-sports', label: 'Water Sports', interest_id: 'outdoors-adventure' },
  { id: 'camping', label: 'Camping', interest_id: 'outdoors-adventure' },
  // Entertainment & Experiences
  { id: 'events-festivals', label: 'Events & Festivals', interest_id: 'experiences-entertainment' },
  { id: 'sports-recreation', label: 'Sports & Recreation', interest_id: 'experiences-entertainment' },
  { id: 'nightlife', label: 'Nightlife', interest_id: 'experiences-entertainment' },
  { id: 'comedy-clubs', label: 'Comedy Clubs', interest_id: 'experiences-entertainment' },
  { id: 'cinemas', label: 'Cinemas', interest_id: 'experiences-entertainment' },
  // Arts & Culture
  { id: 'museums', label: 'Museums', interest_id: 'arts-culture' },
  { id: 'galleries', label: 'Art Galleries', interest_id: 'arts-culture' },
  { id: 'theaters', label: 'Theaters', interest_id: 'arts-culture' },
  { id: 'concerts', label: 'Concerts', interest_id: 'arts-culture' },
  // Family & Pets
  { id: 'family-activities', label: 'Family Activities', interest_id: 'family-pets' },
  { id: 'pet-services', label: 'Pet Services', interest_id: 'family-pets' },
  { id: 'childcare', label: 'Childcare', interest_id: 'family-pets' },
  { id: 'veterinarians', label: 'Veterinarians', interest_id: 'family-pets' },
  // Shopping & Lifestyle
  { id: 'fashion', label: 'Fashion & Clothing', interest_id: 'shopping-lifestyle' },
  { id: 'electronics', label: 'Electronics', interest_id: 'shopping-lifestyle' },
  { id: 'home-decor', label: 'Home Decor', interest_id: 'shopping-lifestyle' },
  { id: 'books', label: 'Books & Media', interest_id: 'shopping-lifestyle' },
];

const MAX_SELECTIONS = 10;

const VALID_INTEREST_IDS = [
  'food-drink',
  'beauty-wellness',
  'professional-services',
  'outdoors-adventure',
  'experiences-entertainment',
  'arts-culture',
  'family-pets',
  'shopping-lifestyle',
];

export interface UseSubcategoriesPageReturn {
  subcategories: SubcategoryItem[];
  groupedSubcategories: Record<string, { title: string; items: SubcategoryItem[] }>;
  selectedSubcategories: string[];
  selectedInterests: string[];
  isNavigating: boolean;
  shakingIds: Set<string>;
  canProceed: boolean;
  handleToggle: (subcategoryId: string, interestId: string) => void;
  handleNext: () => void;
  isLoading: boolean;
  error: Error | null;
}

export function useSubcategoriesPage(): UseSubcategoriesPageReturn {
  const router = useRouter();
  const { showToast } = useToast();
  const { setSelectedSubInterests, setSelectedInterests, isLoading: contextLoading, error: contextError } = useOnboarding();
  const { updateUser } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);
  const [shakingIds, setShakingIds] = useState<Set<string>>(new Set());
  
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
    updateSubcategories,
    refresh: refreshOnboardingData,
  } = useOnboardingData({
    loadFromDatabase: true, // Load from DB to get saved interests
  });

  const selectedSubcategories = data.subcategories;
  const selectedInterests = data.interests;
  
  // Sync OnboardingContext with useOnboardingData
  useEffect(() => {
    if (selectedInterests.length > 0) {
      setSelectedInterests(selectedInterests);
    }
    if (selectedSubcategories.length > 0) {
      setSelectedSubInterests(selectedSubcategories);
    }
  }, [selectedInterests, selectedSubcategories, setSelectedInterests, setSelectedSubInterests]);
  
  const isLoading = dataLoading || contextLoading;
  // Convert string error from context to Error object if needed
  const error: Error | null = dataError || (contextError ? new Error(contextError) : null);

  // Note: Middleware handles routing - if user is not at correct step, they'll be redirected
  // We just ensure we have interests loaded from DB

  // Load data only once on mount - useOnboardingData already handles loading
  // Avoid unnecessary cache invalidation that causes redundant API calls
  // Data is loaded by useOnboardingData hook automatically

  // Early prefetching of remaining onboarding pages for instant navigation
  useEffect(() => {
    if (router) {
      router.prefetch('/deal-breakers');
      router.prefetch('/complete');
    }
  }, [router]);

  // Filter subcategories by selected interests
  const subcategories = useMemo(() => {
    if (selectedInterests.length === 0) {
      return [];
    }
    return ALL_SUBCATEGORIES.filter((sub) =>
      selectedInterests.includes(sub.interest_id)
    );
  }, [selectedInterests]);

  // Group subcategories by interest
  const groupedSubcategories = useMemo(() => {
    const grouped: Record<string, { title: string; items: SubcategoryItem[] }> = {};

    subcategories.forEach((sub) => {
      if (!grouped[sub.interest_id]) {
        grouped[sub.interest_id] = {
          title: INTEREST_TITLES[sub.interest_id] || sub.interest_id,
          items: [],
        };
      }
      grouped[sub.interest_id].items.push(sub);
    });

    return grouped;
  }, [subcategories]);

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

  // Handle subcategory toggle
  const handleToggle = useCallback(
    (subcategoryId: string, interestId: string) => {
      const isSelected = selectedSubcategories.includes(subcategoryId);

      if (isSelected) {
        updateSubcategories(selectedSubcategories.filter((id) => id !== subcategoryId));
      } else {
        if (selectedSubcategories.length >= MAX_SELECTIONS) {
          showToast(`Maximum ${MAX_SELECTIONS} subcategories allowed`, 'warning', 2000);
          triggerShake(subcategoryId);
          return;
        }
        updateSubcategories([...selectedSubcategories, subcategoryId]);
      }
    },
    [selectedSubcategories, updateSubcategories, showToast, triggerShake]
  );

  // Handle next navigation - saves to DB and advances step
  const handleNextInternal = useCallback(async () => {
    // Filter out any interest IDs that might have been passed as subcategories
    const validSubcategories = selectedSubcategories.filter(
      (id) => !VALID_INTEREST_IDS.includes(id)
    );

    if (validSubcategories.length === 0) {
      showToast('Please select at least one subcategory', 'warning', 2000);
      return;
    }

    // Map subcategory IDs to their interest_ids using the static ALL_SUBCATEGORIES
    const subcategoriesWithInterestIds = validSubcategories.map(subId => {
      const subcategory = ALL_SUBCATEGORIES.find(sub => sub.id === subId);
      return {
        subcategory_id: subId,
        interest_id: subcategory?.interest_id || ''
      };
    }).filter(item => item.interest_id); // Filter out any without valid interest_id

    if (subcategoriesWithInterestIds.length === 0) {
      showToast('Invalid subcategory selections', 'error', 2000);
      return;
    }

    // Safe state update (only if mounted)
    if (!isMounted()) return;
    setIsNavigating(true);

    try {
      // Ensure OnboardingContext has latest selections
      if (!isMounted()) return;
      setSelectedSubInterests(validSubcategories);
      
      // Save to API with timeout
      const fetchPromise = fetch('/api/onboarding/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store', // Ensure fresh data
        body: JSON.stringify({
          subcategories: subcategoriesWithInterestIds
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
        const msg = payload?.error || payload?.message || 'Failed to save subcategories';
        throw new Error(msg);
      }

      console.log('[useSubcategoriesPage] Save successful, updating user profile from API response...');

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
          console.log('[useSubcategoriesPage] User profile updated from API response:', {
            onboarding_step: payload.onboarding_step,
            subcategories_count: payload.subcategories_count,
          });
        } catch (updateError) {
          console.warn('[useSubcategoriesPage] Failed to update user profile:', updateError);
          // Continue anyway - the DB is updated, navigation should work
        }
      }

      // Show success toast
      showToast(`Perfect! ${validSubcategories.length} sub-interests added. Now let's set your dealbreakers.`, 'success', 2000);

      // ✅ Navigate directly to next step (DB is already updated, profile is refreshed)
      // Use replace instead of push to prevent back button issues
      router.replace('/deal-breakers');

      // Reset navigating state after navigation completes
      setTimeout(() => {
        if (isMounted()) {
          setIsNavigating(false);
        }
      }, 1000);
    } catch (error: any) {
      console.error('[Subcategories] Submit error:', error);
      
      // Handle timeout specifically
      if (error?.message?.includes('timeout') || error?.name === 'AbortError') {
        if (isMounted()) {
          showToast('Request timed out. Please check your connection and try again.', 'error', 5000);
          setIsNavigating(false);
        }
        return;
      }

      if (isMounted()) {
        showToast(error?.message || 'Failed to save subcategories. Please try again.', 'error', 3000);
        setIsNavigating(false);
      }
    }
  }, [selectedSubcategories, setSelectedSubInterests, showToast, router, isMounted, withTimeout]);

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
    const validSubcategories = selectedSubcategories.filter(
      (id) => !VALID_INTEREST_IDS.includes(id)
    );
    return validSubcategories.length > 0 && !isNavigating;
  }, [selectedSubcategories, isNavigating]);

  return {
    subcategories,
    groupedSubcategories,
    selectedSubcategories,
    selectedInterests,
    isNavigating,
    shakingIds,
    canProceed,
    handleToggle,
    handleNext,
    isLoading,
    error,
  };
}

