"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { Loader } from "../components/Loader";
import DealBreakerStyles from "../components/DealBreakers/DealBreakerStyles";
import DealBreakerHeader from "../components/DealBreakers/DealBreakerHeader";
import DealBreakerSelection from "../components/DealBreakers/DealBreakerSelection";
import DealBreakerGrid from "../components/DealBreakers/DealBreakerGrid";
import DealBreakerActions from "../components/DealBreakers/DealBreakerActions";

interface DealBreaker {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const DEMO_DEAL_BREAKERS: DealBreaker[] = [
  { id: "trustworthiness", label: "Trustworthiness", description: "Reliable and honest service", icon: "shield-checkmark" },
  { id: "punctuality", label: "Punctuality", description: "On-time and respects your schedule", icon: "time" },
  { id: "friendliness", label: "Friendliness", description: "Welcoming and helpful staff", icon: "happy" },
  { id: "value-for-money", label: "Value for Money", description: "Fair pricing and good quality", icon: "cash-outline" },
];


function DealBreakersContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, refreshUser } = useAuth();

  const [selectedDealbreakers, setSelectedDealbreakers] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subcategoryData, setSubcategoryData] = useState<Array<{ subcategory_id: string; interest_id: string }>>([]);

  const MAX_SELECTIONS = 3;

  // Fetch interests and subcategories from DB on mount
  useEffect(() => {
    const fetchOnboardingData = async () => {
      try {
        const response = await fetch('/api/user/onboarding');
        if (response.ok) {
          const data = await response.json();
          setInterests(data.interests || []);
          // Store full subcategory data for proper mapping
          const subcats = (data.subcategories || []).map((sub: any) => ({
            subcategory_id: sub.subcategory_id || sub.id,
            interest_id: sub.interest_id
          }));
          setSubcategoryData(subcats);
          // Also store just IDs for the request
          setSubcategories(subcats.map(sub => sub.subcategory_id));
        }
      } catch (error) {
        console.error('[DealBreakers] Error fetching onboarding data:', error);
      }
    };

    if (user) {
      fetchOnboardingData();
    }
  }, [user]);

  // Enforce prerequisites: user must have completed interests and subcategories
  useEffect(() => {
    if (user) {
      const interestsCount = user.profile?.interests_count || 0;
      const subcategoriesCount = user.profile?.subcategories_count || 0;
      
      if (interestsCount === 0) {
        console.log('DealBreakersPage: No interests selected, redirecting to interests');
        router.replace('/interests');
        return;
      }
      
      if (subcategoriesCount === 0) {
        console.log('DealBreakersPage: No subcategories selected, redirecting to subcategories');
        router.replace('/subcategories');
        return;
      }
    }
  }, [user, router]);

  // Determine back href - no URL params needed
  const backHref = useMemo(() => {
    return '/subcategories';
  }, []);

  // Helper function to get interest_id for a subcategory
  const getInterestIdForSubcategory = useCallback((subcategoryId: string): string => {
    // Use the actual subcategory data from DB
    const subcat = subcategoryData.find(sub => sub.subcategory_id === subcategoryId);
    return subcat?.interest_id || 'food-drink'; // Default fallback
  }, [subcategoryData]);

  const handleDealbreakerToggle = useCallback((dealbreakerId: string) => {
    setSelectedDealbreakers(prev => {
      if (prev.includes(dealbreakerId)) {
        return prev.filter(id => id !== dealbreakerId);
      } else {
        if (prev.length >= MAX_SELECTIONS) {
          showToast(`Maximum ${MAX_SELECTIONS} deal-breakers allowed`, "warning", 2000);
          return prev;
        }
        return [...prev, dealbreakerId];
      }
    });
  }, [showToast]);

  const handleNext = useCallback(async () => {
    setIsNavigating(true);

    try {
      const clickTime = performance.now();
      const requestStart = performance.now();

      // Prefetch complete page immediately for instant navigation
      router.prefetch('/complete');

      // Prepare the data - use subcategoryData directly for proper mapping
      const requestData = {
        step: 'complete',
        interests: interests,
        subcategories: subcategoryData.length > 0 
          ? subcategoryData 
          : subcategories.map(subId => ({
              subcategory_id: subId,
              interest_id: getInterestIdForSubcategory(subId)
            })),
        dealbreakers: selectedDealbreakers
      };

      console.log('[DealBreakers] Sending onboarding data:', requestData);

      // Save data first - API should complete in <2 seconds
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const requestEnd = performance.now();
      const requestTime = requestEnd - requestStart;

      console.log('[DealBreakers] Save completed', {
        requestTime: `${requestTime.toFixed(2)}ms`,
        timestamp: requestEnd
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save onboarding data');
      }

      // Refresh user data after successful save to update profile counts
      await refreshUser();

      const navStart = performance.now();

      // Navigate after successful save
      router.replace('/complete');

      const navEnd = performance.now();
      console.log('[DealBreakers] Navigation started', {
        navTime: `${(navEnd - navStart).toFixed(2)}ms`,
        totalTime: `${(navEnd - clickTime).toFixed(2)}ms`,
        timestamp: navEnd
      });

    } catch (error) {
      console.error('[DealBreakers] Error saving onboarding data:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save. Please try again.', 'error');
      setIsNavigating(false);
    }
  }, [interests, subcategories, selectedDealbreakers, getInterestIdForSubcategory, router, refreshUser, showToast]);

  const canProceed = selectedDealbreakers.length > 0 && !isNavigating;

  return (
    <>
      <DealBreakerStyles />
      <OnboardingLayout step={3} backHref={backHref}>
        <DealBreakerHeader />

        <div className="enter-fade">
          <DealBreakerSelection selectedCount={selectedDealbreakers.length} maxSelections={MAX_SELECTIONS}>
            <DealBreakerGrid 
              dealbreakers={DEMO_DEAL_BREAKERS}
              selectedDealbreakers={selectedDealbreakers}
              maxSelections={MAX_SELECTIONS}
              onToggle={handleDealbreakerToggle}
            />
          </DealBreakerSelection>

          <DealBreakerActions
            canProceed={canProceed}
            isNavigating={isNavigating}
            selectedCount={selectedDealbreakers.length}
            onComplete={handleNext}
          />
        </div>
      </OnboardingLayout>
    </>
  );
}

export default function DealBreakersPage() {
  return (
    <ProtectedRoute requiresAuth={true}>
      <Suspense fallback={
        <OnboardingLayout step={3} backHref="/interests">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader size="md" variant="wavy" color="sage" />
          </div>
        </OnboardingLayout>
      }>
        <DealBreakersContent />
      </Suspense>
    </ProtectedRoute>
  );
}
