"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { showToast } = useToast();

  const [selectedDealbreakers, setSelectedDealbreakers] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  const MAX_SELECTIONS = 3;

  // Prefetch complete page immediately on mount
  useEffect(() => {
    router.prefetch('/complete');
  }, [router]);

  // Load saved dealbreakers from database on mount (for back navigation)
  useEffect(() => {
    const loadSavedDealbreakers = async () => {
      try {
        const response = await fetch('/api/user/onboarding');
        if (response.ok) {
          const data = await response.json();
          const savedDealbreakers = data.dealbreakers || [];
          if (savedDealbreakers.length > 0) {
            console.log('[Deal-breakers] Loaded saved dealbreakers from DB:', savedDealbreakers);
            setSelectedDealbreakers(savedDealbreakers);
          }
        }
      } catch (error) {
        console.error('[Deal-breakers] Error loading saved dealbreakers:', error);
      }
    };

    loadSavedDealbreakers();
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
    if (!selectedDealbreakers || selectedDealbreakers.length === 0) return;

    setIsNavigating(true);

    console.log('[Deal-breakers] Submit clicked', {
      selections: selectedDealbreakers.length,
      selectedDealbreakers: selectedDealbreakers
    });

    // Navigate immediately to complete page
    router.replace('/complete');

    // Save dealbreakers to database in the background AFTER navigation (don't wait)
    fetch('/api/onboarding/dealbreakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealbreakers: selectedDealbreakers })
    }).then(response => {
      if (!response.ok) {
        console.error('[Deal-breakers] Failed to save dealbreakers');
      } else {
        console.log('[Deal-breakers] Dealbreakers saved successfully');
      }
    }).catch(error => {
      console.error('[Deal-breakers] Error saving dealbreakers:', error);
    });
  }, [selectedDealbreakers, router]);

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
