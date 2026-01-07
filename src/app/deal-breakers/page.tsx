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
import { parseOnboardingParams, buildOnboardingUrl, validateOnboardingParams } from "../lib/onboarding/urlParams";

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

  // Validate URL parameters on mount
  useEffect(() => {
    const params = parseOnboardingParams(searchParams);
    
    // Validate that interests and subcategories are present
    const validation = validateOnboardingParams(params, ['interests', 'subcategories']);
    if (!validation.valid) {
      console.warn('[Deal-breakers] Missing required params, redirecting:', validation.missing);
      if (validation.missing.includes('interests')) {
        router.replace('/interests');
      } else if (validation.missing.includes('subcategories')) {
        router.replace('/subcategories');
      }
      return;
    }
  }, [searchParams, router]);

  // Prefetch complete page immediately on mount
  useEffect(() => {
    router.prefetch('/complete');
  }, [router]);

  // CRITICAL: Do NOT hydrate from DB - only use URL params or sessionStorage
  // Brand-new users must start with empty selections
  // Hydrate from URL params if present (for back navigation)
  useEffect(() => {
    const params = parseOnboardingParams(searchParams);
    
    // Set dealbreakers from URL if present (for back navigation)
    if (params.dealbreakers.length > 0) {
      console.log('[Deal-breakers] Hydrating from URL params:', params.dealbreakers);
      setSelectedDealbreakers(params.dealbreakers);
      setContextDealbreakers(params.dealbreakers);
    } else {
      // Start with empty state
      console.log('[Deal-breakers] Starting with empty selection (no URL params)');
      setSelectedDealbreakers([]);
      setContextDealbreakers([]);
    }
  }, [searchParams, setContextDealbreakers]);

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

    console.log('[Deal-breakers] Submit clicked', {
      selections: selectedDealbreakers.length,
      selectedDealbreakers: selectedDealbreakers
    });

    // Get interests and subcategories from URL to pass forward
    const params = parseOnboardingParams(searchParams);
    
    // Navigate to complete page with all selections in URL (no DB save yet)
    const nextUrl = buildOnboardingUrl('/complete', {
      interests: params.interests,
      subcategories: params.subcategories,
      dealbreakers: selectedDealbreakers
    });
    
    router.replace(nextUrl);
  }, [selectedDealbreakers, searchParams, router]);

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
