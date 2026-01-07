"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOnboarding } from "../contexts/OnboardingContext";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import { Loader } from "../components/Loader";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import EmailVerificationBanner from "../components/Auth/EmailVerificationBanner";
import InterestStyles from "../components/Interests/InterestStyles";
import InterestHeader from "../components/Interests/InterestHeader";
import InterestSelection from "../components/Interests/InterestSelection";
import InterestGrid from "../components/Interests/InterestGrid";
import InterestGridSkeleton from "../components/Interests/InterestGridSkeleton";
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
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  // Prefetch all onboarding pages immediately on mount for faster navigation
  useEffect(() => {
    router.prefetch("/subcategories");
    router.prefetch("/deal-breakers");
    router.prefetch("/complete");
  }, [router]);

  // STRICT STATE MACHINE: Use onboarding_step (not counts) for routing
  // If user is on a later step, redirect to their required step
  useEffect(() => {
    if (authLoading || !user) return;
    
    const currentStep = user.profile?.onboarding_step;
    
    // If onboarding is complete, redirect to home
    if (user.profile?.onboarding_complete === true) {
      console.log('[Interests] Onboarding complete, redirecting to home');
      router.replace('/home');
      return;
    }
    
    // If user is on a later step than 'interests', redirect to their required step
    if (currentStep && currentStep !== 'interests') {
      console.log('[Interests] User on later step, redirecting:', {
        currentStep,
        requiredStep: 'interests'
      });
      
      // Map step to route
      const stepToRoute: Record<string, string> = {
        'interests': '/interests',
        'subcategories': '/subcategories',
        'deal-breakers': '/deal-breakers',
        'complete': '/complete',
      };
      
      const requiredRoute = stepToRoute[currentStep] || '/interests';
      router.replace(requiredRoute);
    }
  }, [user, authLoading, router]);

  const MIN_SELECTIONS = 3;
  const MAX_SELECTIONS = 6;

  const {
    selectedInterests,
    setSelectedInterests,
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
        // Use requestAnimationFrame for smoother animation
        requestAnimationFrame(() => {
          const button = document.querySelector(
            `[data-interest-id="${interestId}"]`
          );
          if (button) {
            button.classList.add("animate-shake");
            setTimeout(() => button.classList.remove("animate-shake"), 600);
          }
        });
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
    [selectedInterests, setSelectedInterests, showToast, triggerBounce, MAX_SELECTIONS, MIN_SELECTIONS]
  );

  const canProceed = useMemo(() => {
    const hasMinimumSelection = selectedInterests.length >= MIN_SELECTIONS;
    return hasMinimumSelection && !isNavigating;
  }, [selectedInterests.length, isNavigating]);

  const handleNext = useCallback(async (e?: React.MouseEvent) => {
    // Prevent any default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!canProceed || isNavigating) return;
    
    const clickTime = performance.now();
    console.log('[Interests] Submit clicked', { 
      timestamp: clickTime,
      selections: selectedInterests.length 
    });

    setIsNavigating(true);

    try {
      const requestStart = performance.now();

      // Prefetch subcategories page immediately for instant navigation
      router.prefetch('/subcategories');

      // Save data first - API should complete in <2 seconds
      const response = await fetch('/api/onboarding/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: selectedInterests })
      });

      const requestEnd = performance.now();
      const requestTime = requestEnd - requestStart;

      console.log('[Interests] Save completed', {
        requestTime: `${requestTime.toFixed(2)}ms`,
        timestamp: requestEnd
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save interests');
      }

      // Refresh user data after successful save to update profile counts
      await refreshUser();

      const navStart = performance.now();

      // Navigate after successful save
      router.replace('/subcategories');
      
      // Force refresh to clear Next.js cache and ensure middleware sees updated profile
      router.refresh();

      const navEnd = performance.now();
      console.log('[Interests] Navigation started', {
        navTime: `${(navEnd - navStart).toFixed(2)}ms`,
        totalTime: `${(navEnd - clickTime).toFixed(2)}ms`,
        timestamp: navEnd
      });

    } catch (error) {
      console.error('[Interests] Error saving interests:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save interests. Please try again.', 'error');
      setIsNavigating(false);
    }
  }, [canProceed, selectedInterests, router, showToast, isNavigating, refreshUser]);

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
            <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-center mb-4 enter-fade" style={{ animationDelay: "0.1s" }}>
              <p className="text-sm font-semibold text-red-600">
                {typeof onboardingError === 'string' ? onboardingError : String(onboardingError || 'An error occurred')}
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
        <>
          <InterestStyles />
          <OnboardingLayout backHref="/register" step={1}>
            <InterestHeader isOnline={true} />
            <div className="enter-fade">
              <InterestSelection 
                selectedCount={0}
                minSelections={3}
                maxSelections={6}
              />
              <InterestGridSkeleton />
              <InterestActions
                canProceed={false}
                isNavigating={false}
                selectedCount={0}
                minSelections={3}
                onContinue={() => {}}
              />
            </div>
          </OnboardingLayout>
        </>
      }>
        <InterestsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
