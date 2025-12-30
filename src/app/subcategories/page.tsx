"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useOnboarding } from "../contexts/OnboardingContext";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { selectedSubInterests: selectedSubcategories, setSelectedSubInterests: setSelectedSubcategories, isLoading, error } = useOnboarding();

  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const MAX_SELECTIONS = 10;

  const selectedInterests = useMemo(() => {
    const interestsParam = searchParams.get('interests');
    return interestsParam ? interestsParam.split(',').map(s => s.trim()) : [];
  }, [searchParams]);

  // Enforce prerequisite: user must have selected interests before accessing subcategories
  useEffect(() => {
    if (user) {
      const interestsCount = user.profile?.interests_count || 0;
      if (interestsCount === 0) {
        console.log('SubcategoriesPage: No interests selected, redirecting to interests');
        router.replace('/interests');
        return;
      }
    }
  }, [user, router]);

  useEffect(() => {
    const loadSubcategories = async () => {
      if (selectedInterests.length === 0) {
        // If no interests in URL params, redirect to interests page
        router.replace('/interests');
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/subcategories?interests=${selectedInterests.join(',')}`);

        if (!response.ok) {
          throw new Error('Failed to load subcategories');
        }

        const data = await response.json();
        setSubcategories(data.subcategories || []);
      } catch (error) {
        console.error('Error loading subcategories:', error);
        showToast('Failed to load subcategories', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadSubcategories();
  }, [selectedInterests, router, showToast]);

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

    // Prefetch next page for instant navigation
    const interestParams = selectedInterests.length > 0 
      ? `interests=${selectedInterests.join(',')}` 
      : '';
    const subcategoryParams = selectedSubcategories.join(',');
    
    const urlParams = [interestParams, `subcategories=${subcategoryParams}`]
      .filter(Boolean)
      .join('&');
    
    const nextUrl = `/deal-breakers?${urlParams}`;
    
    // Prefetch before navigating
    router.prefetch(nextUrl);
    
    // Use replace for faster navigation (no history entry)
    router.replace(nextUrl);
  }, [selectedSubcategories, selectedInterests, router]);

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
