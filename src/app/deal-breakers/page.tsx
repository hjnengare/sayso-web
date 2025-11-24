"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import { useToast } from "../contexts/ToastContext";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [selectedDealbreakers, setSelectedDealbreakers] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  // Get all data from URL parameters
  const interests = useMemo(() => {
    const interestsParam = searchParams.get('interests');
    return interestsParam ? interestsParam.split(',').map(s => s.trim()) : [];
  }, [searchParams]);

  const subcategories = useMemo(() => {
    const subcategoriesParam = searchParams.get('subcategories');
    return subcategoriesParam ? subcategoriesParam.split(',').map(s => s.trim()) : [];
  }, [searchParams]);

  // Determine back href based on whether user has interests selected
  const backHref = useMemo(() => {
    if (interests.length > 0) {
      return `/subcategories?interests=${interests.join(',')}`;
    }
    return '/interests';
  }, [interests]);

  // Remove the redirect - allow users to skip directly to deal-breakers
  // useEffect(() => {
  //   if (interests.length === 0 && subcategories.length === 0) {
  //     // No data passed, redirect to start
  //     router.push('/interests');
  //     return;
  //   }
  // }, [interests, subcategories, router]);

  // Helper function to get interest_id for a subcategory
  const getInterestIdForSubcategory = useCallback((subcategoryId: string): string => {
    // This is a simplified mapping - you might want to load subcategories from API to get the actual mapping
    // For now, we'll return a default or try to infer from the subcategory ID
    const interestMapping: { [key: string]: string } = {
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
      // Add more mappings as needed
    };
    return interestMapping[subcategoryId] || 'food-drink'; // Default fallback
  }, []);

  const handleDealbreakerToggle = useCallback((dealbreakerId: string) => {
    setSelectedDealbreakers(prev => {
      if (prev.includes(dealbreakerId)) {
        return prev.filter(id => id !== dealbreakerId);
      } else {
        return [...prev, dealbreakerId];
      }
    });
  }, []);

  const handleNext = useCallback(async () => {
    setIsNavigating(true);

    try {
      // Prepare the data
      const requestData = {
        step: 'complete',
        interests: interests,
        subcategories: subcategories.map(subId => ({
          subcategory_id: subId,
          interest_id: getInterestIdForSubcategory(subId)
        })),
        dealbreakers: selectedDealbreakers
      };

      console.log('Sending onboarding data:', requestData);

      // Save ALL onboarding data at once - interests, subcategories, and dealbreakers
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        // Log error but still proceed to complete page
        // The onboarding UI flow is complete even if save fails
        console.warn('Onboarding save failed, but proceeding to complete page');
      }

      // Redirect to complete page after deal-breakers
      // Use replace instead of push to prevent back navigation
      router.replace('/complete');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      showToast('Failed to save onboarding data, but continuing...', 'sage');
      // Still redirect to complete page even on error
      // The user has completed the onboarding flow UI-wise
      router.replace('/complete');
      setIsNavigating(false);
    }
  }, [interests, subcategories, selectedDealbreakers, getInterestIdForSubcategory, router, showToast]);

  const canProceed = selectedDealbreakers.length > 0 && !isNavigating;

  return (
    <>
      <DealBreakerStyles />
      <OnboardingLayout step={3} backHref={backHref}>
        <DealBreakerHeader />

        <div className="enter-fade">
          <DealBreakerSelection selectedCount={selectedDealbreakers.length}>
            <DealBreakerGrid 
              dealbreakers={DEMO_DEAL_BREAKERS}
              selectedDealbreakers={selectedDealbreakers}
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
            <Loader size="md" color="sage" text="Loading deal-breakers..." />
          </div>
        </OnboardingLayout>
      }>
        <DealBreakersContent />
      </Suspense>
    </ProtectedRoute>
  );
}
