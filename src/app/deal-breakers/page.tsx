"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
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
import { useOnboarding } from "../contexts/OnboardingContext";

// Safe wrapper for useOnboarding that doesn't throw if provider is missing
function useOnboardingSafe() {
  try {
    return useOnboarding();
  } catch (error) {
    // Provider not available - return default values
    return {
      selectedInterests: [],
      selectedSubInterests: [],
      setSelectedDealbreakers: () => {},
      completeOnboarding: async () => {}
    };
  }
}

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
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { selectedInterests, selectedSubInterests, setSelectedDealbreakers: setContextDealbreakers } = useOnboardingSafe();

  const [selectedDealbreakers, setSelectedDealbreakers] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const MAX_SELECTIONS = 3;

  // Read URL parameters for interests and subcategories (for validation)
  useEffect(() => {
    const interestsParam = searchParams?.get('interests');
    const subcategoriesParam = searchParams?.get('subcategories');
    
    if (interestsParam) {
      console.log('[Deal-breakers] Interests from URL:', interestsParam);
    }
    if (subcategoriesParam) {
      console.log('[Deal-breakers] Subcategories from URL:', subcategoriesParam);
    }
  }, [searchParams]);

  // Prefetch complete page immediately on mount
  useEffect(() => {
    router.prefetch('/complete');
  }, [router]);

  // Load saved dealbreakers from database on mount (for back navigation)
  // CRITICAL: Only hydrate if user has actually saved dealbreakers (dealbreakers_count > 0)
  // Brand-new users must see ZERO dealbreakers selected
  useEffect(() => {
    const loadSavedDealbreakers = async () => {
      try {
        const response = await fetch('/api/user/onboarding');
        if (response && response.ok) {
          const data = await response.json();
          const dealbreakersCount = data.dealbreakers_count || 0;
          const savedDealbreakers = data.dealbreakers || [];
          
          // ONLY hydrate if user has explicitly saved dealbreakers before
          // This prevents preselection for brand-new users
          if (dealbreakersCount > 0 && savedDealbreakers.length > 0) {
            console.log('[Deal-breakers] Loaded saved dealbreakers from DB:', savedDealbreakers);
            setSelectedDealbreakers(savedDealbreakers);
            setContextDealbreakers(savedDealbreakers);
          } else {
            // Brand-new user - ensure empty state
            console.log('[Deal-breakers] New user detected, starting with empty selection');
            setSelectedDealbreakers([]);
            setContextDealbreakers([]);
          }
        }
      } catch (error) {
        console.error('[Deal-breakers] Error loading saved dealbreakers:', error);
        // On error, ensure empty state for new users
        setSelectedDealbreakers([]);
        setContextDealbreakers([]);
      }
    };

    loadSavedDealbreakers();
  }, [setContextDealbreakers]);

  const handleDealbreakerToggle = useCallback((dealbreakerId: string) => {
    setSelectedDealbreakers(prev => {
      let updated: string[];
      if (prev.includes(dealbreakerId)) {
        updated = prev.filter(id => id !== dealbreakerId);
      } else {
        if (prev.length >= MAX_SELECTIONS) {
          showToast(`Maximum ${MAX_SELECTIONS} deal-breakers allowed`, "warning", 2000);
          return prev;
        }
        updated = [...prev, dealbreakerId];
      }
      // Update context as well
      setContextDealbreakers(updated);
      return updated;
    });
  }, [showToast, setContextDealbreakers]);

  const handleNext = useCallback(async () => {
    if (!selectedDealbreakers || selectedDealbreakers.length === 0) return;

    setIsNavigating(true);
    setIsSaving(true);

    console.log('[Deal-breakers] Submit clicked', {
      selections: selectedDealbreakers.length,
      selectedDealbreakers: selectedDealbreakers
    });

    try {
      // Use the unified onboarding API to save all data and mark as complete
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'complete',
          interests: selectedInterests || [],
          subcategories: selectedSubInterests || [],
          dealbreakers: selectedDealbreakers
        })
      });

      if (!response || !response.ok) {
        const errorText = response ? await response.text().catch(() => 'Unknown error') : 'Network error';
        throw new Error(errorText || 'Failed to save onboarding data');
      }

      console.log('[Deal-breakers] Onboarding completed successfully');
      
      // Navigate to complete page after successful save
      router.replace('/complete');
    } catch (error) {
      console.error('[Deal-breakers] Error completing onboarding:', error);
      
      // Show error toast but still allow navigation (graceful degradation)
      showToast('Failed to save onboarding data, but continuing...', 'sage', 3000);
      
      // Still navigate to complete page even if API fails
      router.replace('/complete');
    } finally {
      setIsSaving(false);
    }
  }, [selectedDealbreakers, selectedInterests, selectedSubInterests, router, showToast]);

  const canProceed = selectedDealbreakers.length > 0 && !isNavigating;

  return (
    <>
      <DealBreakerStyles />
      <OnboardingLayout step={3} backHref="/subcategories">
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
