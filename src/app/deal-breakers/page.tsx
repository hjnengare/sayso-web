"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [selectedDealbreakers, setSelectedDealbreakers] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  const MAX_SELECTIONS = 3;

  // Get all data from URL parameters
  const interests = useMemo(() => {
    const interestsParam = searchParams.get('interests');
    return interestsParam ? interestsParam.split(',').map(s => s.trim()) : [];
  }, [searchParams]);

  const subcategories = useMemo(() => {
    const subcategoriesParam = searchParams.get('subcategories');
    return subcategoriesParam ? subcategoriesParam.split(',').map(s => s.trim()) : [];
  }, [searchParams]);

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

  // Determine back href based on whether user has interests selected
  const backHref = useMemo(() => {
    if (interests.length > 0) {
      return `/subcategories?interests=${interests.join(',')}`;
    }
    return '/interests';
  }, [interests]);

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

    // Prefetch complete page immediately for instant navigation
    router.prefetch('/complete');

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

    // Redirect immediately - don't wait for API response
    // This ensures <2s navigation time
    router.replace('/complete');

    // Save data in background (non-blocking)
    // Use fetch with keepalive or fire-and-forget pattern
    fetch('/api/user/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
      keepalive: true // Keep request alive even after navigation
    }).catch((error) => {
      console.error('Background save error (non-blocking):', error);
      // Error is logged but doesn't block user flow
    });
  }, [interests, subcategories, selectedDealbreakers, getInterestIdForSubcategory, router]);

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
