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
import SubcategoryGridSkeleton from "../components/Subcategories/SubcategoryGridSkeleton";
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
  const { user, refreshUser } = useAuth();
  const { selectedSubInterests: selectedSubcategories, setSelectedSubInterests: setSelectedSubcategories, isLoading, error } = useOnboarding();

  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const MAX_SELECTIONS = 10;

  // Fetch user's saved interests from DB (no URL params)
  const userInterests = useMemo(() => {
    // Always fetch from API - no URL params
    return null; // Signal to fetch from API
  }, []);

  // Enforce prerequisite: user must have selected interests before accessing subcategories
  useEffect(() => {
    if (user) {
      const interestsCount = user.profile?.interests_count || 0;
      if (interestsCount === 0) {
        console.log('[Subcategories] No interests selected, redirecting to interests');
        router.replace('/interests');
        return;
      }
    }
  }, [user, router]);

  // Fetch subcategories on page load - show skeleton immediately
  useEffect(() => {
    let cancelled = false;
    
    const loadSubcategories = async () => {
      const fetchStart = performance.now();
      console.log('[Subcategories] Fetch started', { timestamp: fetchStart });

      try {
        setLoading(true);
        
        // Fetch user's interests first if we don't have them
        let interestsToUse = userInterests;
        
        if (!interestsToUse || interestsToUse.length === 0) {
          // Fetch from API
          const interestsResponse = await fetch('/api/user/onboarding');
          if (cancelled) return;
          
          if (interestsResponse.ok) {
            const interestsData = await interestsResponse.json();
            interestsToUse = interestsData.interests || [];
          }
        }

        if (cancelled) return;

        if (!interestsToUse || interestsToUse.length === 0) {
          router.replace('/interests');
          return;
        }

        const apiStart = performance.now();
        const response = await fetch(`/api/subcategories?interests=${interestsToUse.join(',')}`);
        if (cancelled) return;
        
        const apiEnd = performance.now();

        if (!response.ok) {
          throw new Error('Failed to load subcategories');
        }

        const data = await response.json();
        if (cancelled) return;
        
        setSubcategories(data.subcategories || []);

        const fetchEnd = performance.now();
        console.log('[Subcategories] Fetch completed', {
          apiTime: `${(apiEnd - apiStart).toFixed(2)}ms`,
          totalTime: `${(fetchEnd - fetchStart).toFixed(2)}ms`,
          subcategoriesCount: data.subcategories?.length || 0,
          timestamp: fetchEnd
        });
      } catch (error) {
        if (cancelled) return;
        console.error('[Subcategories] Error loading subcategories:', error);
        showToast('Failed to load subcategories', 'error');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSubcategories();
    
    return () => {
      cancelled = true;
    };
  }, [router, showToast, userInterests]);

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

    const clickTime = performance.now();
    console.log('[Subcategories] Submit clicked', { 
      timestamp: clickTime,
      selections: selectedSubcategories.length 
    });

    setIsNavigating(true);

    try {
      const requestStart = performance.now();
      
      // Minimal write: save subcategories only
      // Map to format expected by API
      const subcategoryData = selectedSubcategories.map(subId => {
        // Find the subcategory to get its interest_id
        const sub = subcategories.find(s => s.id === subId);
        return {
          subcategory_id: subId,
          interest_id: sub?.interest_id || 'food-drink' // fallback
        };
      });

      const response = await fetch('/api/onboarding/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subcategories: subcategoryData })
      });

      const requestEnd = performance.now();
      const requestTime = requestEnd - requestStart;
      
      console.log('[Subcategories] Save completed', {
        requestTime: `${requestTime.toFixed(2)}ms`,
        timestamp: requestEnd
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save subcategories');
      }

      // Refresh user data after successful save to update profile counts
      // This ensures OnboardingGuard allows access to deal-breakers page
      await refreshUser();

      const navStart = performance.now();
      
      // Navigate after successful save - no URL params needed, data is in DB
      router.prefetch('/deal-breakers');
      router.replace('/deal-breakers');
      
      // Force refresh to clear Next.js cache and ensure middleware sees updated profile
      router.refresh();
      
      const navEnd = performance.now();
      console.log('[Subcategories] Navigation started', {
        navTime: `${(navEnd - navStart).toFixed(2)}ms`,
        totalTime: `${(navEnd - clickTime).toFixed(2)}ms`,
        timestamp: navEnd
      });

    } catch (error) {
      console.error('[Subcategories] Error saving subcategories:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save subcategories. Please try again.', 'error');
      setIsNavigating(false);
    }
  }, [selectedSubcategories, subcategories, router, showToast, refreshUser]);

  const canProceed = (selectedSubcategories?.length || 0) > 0 && !isNavigating;

  // Show skeleton immediately while loading
  if (loading) {
    return (
      <>
        <SubcategoryStyles />
        <OnboardingLayout step={2} backHref="/interests">
          <SubcategoryHeader />
          <div className="enter-fade">
            <SubcategorySelection selectedCount={0} maxSelections={MAX_SELECTIONS}>
              <SubcategoryGridSkeleton />
            </SubcategorySelection>
            <SubcategoryActions
              canProceed={false}
              isNavigating={false}
              isLoading={false}
              selectedCount={0}
              onContinue={() => {}}
            />
          </div>
        </OnboardingLayout>
      </>
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
        <>
          <SubcategoryStyles />
          <OnboardingLayout step={2} backHref="/interests">
            <SubcategoryHeader />
            <div className="enter-fade">
              <SubcategorySelection selectedCount={0} maxSelections={10}>
                <SubcategoryGridSkeleton />
              </SubcategorySelection>
              <SubcategoryActions
                canProceed={false}
                isNavigating={false}
                isLoading={false}
                selectedCount={0}
                onContinue={() => {}}
              />
            </div>
          </OnboardingLayout>
        </>
      }>
        <SubcategoriesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
