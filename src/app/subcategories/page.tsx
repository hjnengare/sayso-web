"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOnboarding } from "../contexts/OnboardingContext";
import { useToast } from "../contexts/ToastContext";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import SubcategoryStyles from "../components/Subcategories/SubcategoryStyles";
import SubcategoryHeader from "../components/Subcategories/SubcategoryHeader";
import SubcategorySelection from "../components/Subcategories/SubcategorySelection";
import SubcategoryGrid from "../components/Subcategories/SubcategoryGrid";
import SubcategoryActions from "../components/Subcategories/SubcategoryActions";
import { Loader } from "../components/Loader";


interface SubcategoryItem {
  id: string;
  label: string;
  interest_id: string;
}

interface GroupedSubcategories {
  [interestId: string]: {
    title: string;
    items: SubcategoryItem[];
  };
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

function SubcategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { selectedSubInterests: selectedSubcategories, setSelectedSubInterests: setSelectedSubcategories, isLoading, error } = useOnboarding();

  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const MAX_SELECTIONS = 10;

  // Get interests from URL params for instant filtering
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Prefetch next page immediately on mount
  useEffect(() => {
    router.prefetch('/deal-breakers');
  }, [router]);

  // Load interests and subcategories from database on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // First, get interests from URL if available
        const interestsParam = searchParams.get('interests');
        let interests: string[] = [];
        
        if (interestsParam) {
          // Use interests from URL (instant)
          interests = interestsParam.split(',').map(s => s.trim()).filter(Boolean);
          setSelectedInterests(interests);
        } else {
          // Load interests from database (for back navigation)
          // CRITICAL: Only hydrate if user has actually saved data
          const response = await fetch('/api/user/onboarding');
          if (response.ok) {
            const data = await response.json();
            const interestsCount = data.interests_count || 0;
            const subcategoriesCount = data.subcategories_count || 0;
            
            // ONLY hydrate interests if user has explicitly saved them
            if (interestsCount > 0) {
              interests = data.interests || [];
              setSelectedInterests(interests);
            } else {
              interests = [];
              setSelectedInterests([]);
            }
            
            // ONLY hydrate subcategories if user has explicitly saved them
            if (subcategoriesCount > 0) {
              const savedSubcategories = data.subcategories || [];
              const subcategoryIds = savedSubcategories.map((item: { subcategory_id: string }) => item.subcategory_id);
              if (subcategoryIds.length > 0) {
                console.log('[Subcategories] Loaded saved subcategories from DB:', subcategoryIds);
                setSelectedSubcategories(subcategoryIds);
              }
            } else {
              // Brand-new user - ensure empty state
              setSelectedSubcategories([]);
            }
          }
        }
      } catch (error) {
        console.error('[Subcategories] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [searchParams, setSelectedSubcategories]);

  useEffect(() => {
    // Load subcategories directly (static data) - no API call needed
    // Use interests for filtering
    if (selectedInterests.length === 0) {
      setSubcategories([]);
      return;
    }
    
    // Static subcategories data - matches the API
    const ALL_SUBCATEGORIES = [
      // Food & Drink
      { id: "restaurants", label: "Restaurants", interest_id: "food-drink" },
      { id: "cafes", label: "Cafés & Coffee", interest_id: "food-drink" },
      { id: "bars", label: "Bars & Pubs", interest_id: "food-drink" },
      { id: "fast-food", label: "Fast Food", interest_id: "food-drink" },
      { id: "fine-dining", label: "Fine Dining", interest_id: "food-drink" },
      // Beauty & Wellness
      { id: "gyms", label: "Gyms & Fitness", interest_id: "beauty-wellness" },
      { id: "spas", label: "Spas", interest_id: "beauty-wellness" },
      { id: "salons", label: "Hair Salons", interest_id: "beauty-wellness" },
      { id: "wellness", label: "Wellness Centers", interest_id: "beauty-wellness" },
      { id: "nail-salons", label: "Nail Salons", interest_id: "beauty-wellness" },
      // Professional Services
      { id: "education-learning", label: "Education & Learning", interest_id: "professional-services" },
      { id: "transport-travel", label: "Transport & Travel", interest_id: "professional-services" },
      { id: "finance-insurance", label: "Finance & Insurance", interest_id: "professional-services" },
      { id: "plumbers", label: "Plumbers", interest_id: "professional-services" },
      { id: "electricians", label: "Electricians", interest_id: "professional-services" },
      { id: "legal-services", label: "Legal Services", interest_id: "professional-services" },
      // Outdoors & Adventure
      { id: "hiking", label: "Hiking", interest_id: "outdoors-adventure" },
      { id: "cycling", label: "Cycling", interest_id: "outdoors-adventure" },
      { id: "water-sports", label: "Water Sports", interest_id: "outdoors-adventure" },
      { id: "camping", label: "Camping", interest_id: "outdoors-adventure" },
      // Entertainment & Experiences
      { id: "events-festivals", label: "Events & Festivals", interest_id: "experiences-entertainment" },
      { id: "sports-recreation", label: "Sports & Recreation", interest_id: "experiences-entertainment" },
      { id: "nightlife", label: "Nightlife", interest_id: "experiences-entertainment" },
      { id: "comedy-clubs", label: "Comedy Clubs", interest_id: "experiences-entertainment" },
      { id: "cinemas", label: "Cinemas", interest_id: "experiences-entertainment" },
      // Arts & Culture
      { id: "museums", label: "Museums", interest_id: "arts-culture" },
      { id: "galleries", label: "Art Galleries", interest_id: "arts-culture" },
      { id: "theaters", label: "Theaters", interest_id: "arts-culture" },
      { id: "concerts", label: "Concerts", interest_id: "arts-culture" },
      // Family & Pets
      { id: "family-activities", label: "Family Activities", interest_id: "family-pets" },
      { id: "pet-services", label: "Pet Services", interest_id: "family-pets" },
      { id: "childcare", label: "Childcare", interest_id: "family-pets" },
      { id: "veterinarians", label: "Veterinarians", interest_id: "family-pets" },
      // Shopping & Lifestyle
      { id: "fashion", label: "Fashion & Clothing", interest_id: "shopping-lifestyle" },
      { id: "electronics", label: "Electronics", interest_id: "shopping-lifestyle" },
      { id: "home-decor", label: "Home Decor", interest_id: "shopping-lifestyle" },
      { id: "books", label: "Books & Media", interest_id: "shopping-lifestyle" }
    ];

    // Filter by selected interests
    const filtered = ALL_SUBCATEGORIES.filter(sub => selectedInterests.includes(sub.interest_id));

    // Set subcategories immediately
    setSubcategories(filtered);
  }, [selectedInterests]);

  const groupedSubcategories = useMemo(() => {
    const grouped: GroupedSubcategories = {};

    subcategories.forEach(sub => {
      if (!grouped[sub.interest_id]) {
        grouped[sub.interest_id] = {
          title: INTEREST_TITLES[sub.interest_id] || sub.interest_id,
          items: []
        };
      }
      grouped[sub.interest_id].items.push(sub);
    });

    return grouped;
  }, [subcategories]);

  const handleSubcategoryToggle = useCallback((subcategoryId: string, interestId: string) => {
    const isSelected = selectedSubcategories.includes(subcategoryId);

    if (isSelected) {
      setSelectedSubcategories(selectedSubcategories.filter(s => s !== subcategoryId));
    } else {
      if (selectedSubcategories.length >= MAX_SELECTIONS) {
        showToast(`Maximum ${MAX_SELECTIONS} subcategories allowed`, "warning", 2000);
        return;
      }
      setSelectedSubcategories([...selectedSubcategories, subcategoryId]);
    }
  }, [selectedSubcategories, setSelectedSubcategories, showToast]);

  const handleNext = useCallback(async () => {
    if (!selectedSubcategories || selectedSubcategories.length === 0) return;

    setIsNavigating(true);

    // Valid interest IDs (to ensure we don't accidentally send interests as subcategories)
    const VALID_INTEREST_IDS = [
      'food-drink',
      'beauty-wellness',
      'professional-services',
      'outdoors-adventure',
      'experiences-entertainment',
      'arts-culture',
      'family-pets',
      'shopping-lifestyle'
    ];

    // Prepare subcategories data with interest_id for each subcategory
    // CRITICAL: Filter out any subcategoryId that matches an interest ID
    const subcategoriesData = selectedSubcategories
      .filter(subcategoryId => {
        // Ensure subcategoryId is NOT an interest ID
        if (VALID_INTEREST_IDS.includes(subcategoryId)) {
          console.warn('[Subcategories] Filtered out interest ID passed as subcategory:', subcategoryId);
          return false;
        }
        return true;
      })
      .map(subcategoryId => {
        const subcategory = subcategories.find(s => s.id === subcategoryId);
        return {
          subcategory_id: subcategoryId,
          interest_id: subcategory?.interest_id || ''
        };
      })
      .filter(item => {
        // Filter out any without interest_id AND ensure subcategory_id is not an interest
        return item.interest_id && !VALID_INTEREST_IDS.includes(item.subcategory_id);
      });

    console.log('[Subcategories] Submit clicked', {
      selections: subcategoriesData.length,
      subcategoriesData: subcategoriesData
    });

    // Navigate immediately to dealbreakers
    router.replace('/deal-breakers');

    // Save to database in the background AFTER navigation (don't wait)
    fetch('/api/onboarding/subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subcategories: subcategoriesData })
    }).then(response => {
      if (!response.ok) {
        console.error('[Subcategories] Failed to save subcategories');
      } else {
        console.log('[Subcategories] Subcategories saved successfully');
      }
    }).catch(error => {
      console.error('[Subcategories] Error saving subcategories:', error);
    });
  }, [selectedSubcategories, subcategories, router]);

  const canProceed = (selectedSubcategories?.length || 0) > 0 && !isNavigating;

  if (loading) {
    return (
      <OnboardingLayout step={2} backHref="/interests">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader size="md" variant="wavy" color="sage" />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <>
      <SubcategoryStyles />
      <OnboardingLayout step={2} backHref="/interests">
        <SubcategoryHeader />

        <div className="enter-fade">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-center mb-4">
              <p className="text-sm font-semibold text-red-600">
                {typeof error === 'string' ? error : String(error || 'An error occurred')}
              </p>
            </div>
          )}

          <SubcategorySelection selectedCount={selectedSubcategories?.length || 0} maxSelections={MAX_SELECTIONS}>
            <SubcategoryGrid
              groupedSubcategories={groupedSubcategories}
              selectedSubcategories={selectedSubcategories.map(id => {
                const subcategory = subcategories.find(s => s.id === id);
                return { id, interest_id: subcategory?.interest_id || '' };
              })}
              maxSelections={MAX_SELECTIONS}
              onToggle={handleSubcategoryToggle}
              subcategories={subcategories}
              loading={loading}
            />
          </SubcategorySelection>

          <SubcategoryActions
            canProceed={canProceed}
            isNavigating={isNavigating}
            isLoading={isLoading}
            selectedCount={selectedSubcategories?.length || 0}
            onContinue={handleNext}
          />
        </div>
      </OnboardingLayout>
    </>
  );
}

export default function SubcategoriesPage() {
  return (
    <ProtectedRoute requiresAuth={true}>
      <Suspense fallback={
        <OnboardingLayout step={2} backHref="/interests">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader size="md" variant="wavy" color="sage" />
          </div>
        </OnboardingLayout>
      }>
        <SubcategoriesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
