"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOnboarding } from "../contexts/OnboardingContext";
import { useToast } from "../contexts/ToastContext";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import { Loader } from "../components/Loader";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import EmailVerificationBanner from "../components/Auth/EmailVerificationBanner";
import InterestStyles from "../components/Interests/InterestStyles";
import InterestHeader from "../components/Interests/InterestHeader";
import InterestSelection from "../components/Interests/InterestSelection";
import InterestGrid from "../components/Interests/InterestGrid";
import InterestActions from "../components/Interests/InterestActions";


function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface Interest {
  id: string;
  name: string;
}

const INTERESTS: Interest[] = [
  { id: 'food-drink', name: 'Food & Drink' },
  { id: 'beauty-wellness', name: 'Beauty & Wellness' },
  { id: 'professional-services', name: 'Professional Services' },
  { id: 'outdoors-adventure', name: 'Outdoors & Adventure' },
  { id: 'experiences-entertainment', name: 'Entertainment & Experiences' },
  { id: 'arts-culture', name: 'Arts & Culture' },
  { id: 'family-pets', name: 'Family & Pets' },
  { id: 'shopping-lifestyle', name: 'Shopping & Lifestyle' },
];

function InterestsContent() {
  const mounted = useMounted();
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasPrefetched, setHasPrefetched] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, showToastOnce } = useToast();

  // Prefetch next page immediately on mount for faster navigation
  useEffect(() => {
    router.prefetch("/subcategories");
  }, [router]);

  const MIN_SELECTIONS = 3;
  const MAX_SELECTIONS = 6;

  const {
    selectedInterests,
    setSelectedInterests,
    nextStep,
    isLoading: onboardingLoading,
    error: onboardingError,
  } = useOnboarding();

  const analyticsTracked = useRef({
    impression: false,
    firstSelection: false,
    minimumReached: false,
  });

  // Handle verification success from URL flag - optimize for fast loading
  useEffect(() => {
    const verified = searchParams.get('verified');
    const emailVerified = searchParams.get('email_verified');
    
    if (verified === '1' || emailVerified === 'true') {
      // Show toast immediately without blocking
      showToastOnce('email-verified-v1', '🎉 You\'re verified! Your account is now secured and ready.', 'success', 3000);

      // Clean up URL params asynchronously to not block rendering
      requestAnimationFrame(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('verified');
        url.searchParams.delete('email_verified');
        router.replace(url.pathname + (url.search ? '?' + url.searchParams.toString() : ''), { scroll: false });
      });
    }
  }, [searchParams, router, showToastOnce]);

  const triggerBounce = useCallback((id: string, ms = 700) => {
    setAnimatingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setAnimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, ms);
  }, []);

  useEffect(() => {
    const count = selectedInterests.length;

    if (count === 1 && !analyticsTracked.current.firstSelection) {
      analyticsTracked.current.firstSelection = true;
      console.log("Analytics: First interest selected");
    }

    if (count >= MIN_SELECTIONS && !analyticsTracked.current.minimumReached) {
      analyticsTracked.current.minimumReached = true;
      console.log("Analytics: Minimum selections reached");

      if (!hasPrefetched) {
        router.prefetch("/subcategories");
        setHasPrefetched(true);
        console.log("Prefetching: /subcategories page prefetched");
      }
    }
  }, [selectedInterests.length, router, hasPrefetched]);

  useEffect(() => {
    if (mounted && !analyticsTracked.current.impression) {
      analyticsTracked.current.impression = true;
      console.log("Analytics: Interests page impression");
    }
  }, [mounted]);

  const handleInterestToggle = useCallback(
    (interestId: string) => {
      const isCurrentlySelected = selectedInterests.includes(interestId);
      triggerBounce(interestId);

      if (!isCurrentlySelected && selectedInterests.length >= MAX_SELECTIONS) {
        showToast(`Maximum ${MAX_SELECTIONS} interests allowed`, "warning", 2000);
        const button = document.querySelector(
          `[data-interest-id="${interestId}"]`
        );
        if (button) {
          button.classList.add("animate-shake");
          setTimeout(() => button.classList.remove("animate-shake"), 600);
        }
        return;
      }

      const newSelection = isCurrentlySelected
        ? selectedInterests.filter((id) => id !== interestId)
        : [...selectedInterests, interestId];

      setSelectedInterests(newSelection);

      if (!isCurrentlySelected) {
        if (newSelection.length === MIN_SELECTIONS) {
          showToast("🎉 Great! You can continue now", "sage", 2000);
        } else if (newSelection.length === MAX_SELECTIONS) {
          showToast("✨ Perfect selection!", "sage", 2000);
        }
      }
    },
    [selectedInterests, setSelectedInterests, showToast, triggerBounce]
  );

  const canProceed = useMemo(() => {
    const hasMinimumSelection = selectedInterests.length >= MIN_SELECTIONS;
    return hasMinimumSelection && !isNavigating;
  }, [selectedInterests.length, isNavigating]);

  const handleNext = useCallback(async () => {
    if (!canProceed) return;
    setIsNavigating(true);

    console.log("Analytics: Next button clicked", {
      selections: selectedInterests.length,
    });

    try {
      await nextStep();
    } catch (error) {
      console.error("Error proceeding to next step:", error);
      setIsNavigating(false);
    }
  }, [canProceed, nextStep, selectedInterests.length]);

  const hydratedSelected = mounted ? selectedInterests : [];
  const list = INTERESTS;

  return (
    <EmailVerificationGuard>
      <InterestStyles />

      <OnboardingLayout
        backHref="/register"
        step={1}
      >
        <EmailVerificationBanner className="mb-4" />
        <InterestHeader isOnline={isOnline} />

        <div className="enter-fade">
          {onboardingError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4 enter-fade" style={{ animationDelay: "0.1s" }}>
              <p className="text-sm font-semibold text-red-600">
                {onboardingError}
              </p>
            </div>
          )}

          <InterestSelection 
            selectedCount={hydratedSelected.length}
            minSelections={MIN_SELECTIONS}
            maxSelections={MAX_SELECTIONS}
          />

          <InterestGrid
            interests={list}
            selectedInterests={hydratedSelected}
            maxSelections={MAX_SELECTIONS}
            animatingIds={animatingIds}
            onToggle={handleInterestToggle}
          />

          <InterestActions
            canProceed={canProceed}
            isNavigating={isNavigating}
            selectedCount={hydratedSelected.length}
            minSelections={MIN_SELECTIONS}
            onContinue={handleNext}
          />
        </div>
      </OnboardingLayout>
    </EmailVerificationGuard>
  );
}

export default function InterestsPage() {
  return (
    <ProtectedRoute requiresAuth={true}>
      <Suspense fallback={
        <OnboardingLayout backHref="/register" step={1}>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader size="md" variant="pulse" color="sage" />
          </div>
        </OnboardingLayout>
      }>
      <InterestsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
