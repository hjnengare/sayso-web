/**
 * useSubcategoriesPage Hook (Simplified - localStorage only)
 * Encapsulates all logic for the subcategories page without DB calls
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useToast } from '../contexts/ToastContext';
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
  travel: 'Travel',
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
  // Travel
  { id: 'accommodation', label: 'Accommodation', interest_id: 'travel' },
  { id: 'transport', label: 'Transport', interest_id: 'travel' },
  { id: 'travel-services', label: 'Travel Services', interest_id: 'travel' },
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
  error: Error | null;
}

export function useSubcategoriesPage(): UseSubcategoriesPageReturn {
  const router = useRouter();
  const { showToast } = useToast();
  const { refreshUser } = useAuth();
  const {
    selectedInterests,
    selectedSubInterests,
    setSelectedSubInterests,
    error: contextError
  } = useOnboarding();

  const [isNavigating, setIsNavigating] = useState(false);
  const [shakingIds, setShakingIds] = useState<Set<string>>(new Set());

  const error: Error | null = contextError ? new Error(contextError) : null;

  // Early prefetching
  useEffect(() => {
    router.prefetch('/deal-breakers');
    router.prefetch('/complete');
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
      const isSelected = selectedSubInterests.includes(subcategoryId);

      if (isSelected) {
        setSelectedSubInterests(selectedSubInterests.filter((id) => id !== subcategoryId));
      } else {
        if (selectedSubInterests.length >= MAX_SELECTIONS) {
          showToast(`Max ${MAX_SELECTIONS} selected`, 'sage', 2000);
          triggerShake(subcategoryId);
          return;
        }
        setSelectedSubInterests([...selectedSubInterests, subcategoryId]);
      }
    },
    [selectedSubInterests, setSelectedSubInterests, showToast, triggerShake]
  );

  // Handle next navigation - save to DB and navigate
  const handleNext = useCallback(async () => {
    if (selectedSubInterests.length === 0) {
      showToast('Select at least one', 'sage', 2000);
      return;
    }

    setIsNavigating(true);

    try {
      // Save subcategories to database
      const response = await fetch('/api/onboarding/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subcategories: selectedSubInterests }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save subcategories');
      }

      // Refresh profile so AuthContext has latest onboarding_step and subcategories_count
      await refreshUser();

      router.replace('/deal-breakers');
    } catch (error) {
      console.error('[Subcategories] Error saving:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save subcategories';
      showToast(errorMessage, 'sage', 4000);
      setIsNavigating(false);
    }
  }, [selectedSubInterests, showToast, router, refreshUser]);

  // Check if can proceed
  const canProceed = useMemo(() => {
    return selectedSubInterests.length > 0 && !isNavigating;
  }, [selectedSubInterests.length, isNavigating]);

  return {
    subcategories,
    groupedSubcategories,
    selectedSubcategories: selectedSubInterests,
    selectedInterests,
    isNavigating,
    shakingIds,
    canProceed,
    handleToggle,
    handleNext,
    error,
  };
}
