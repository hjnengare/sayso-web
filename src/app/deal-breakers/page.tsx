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
import DealBreakerGridSkeleton from "../components/DealBreakers/DealBreakerGridSkeleton";
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
  const [loading, setLoading] = useState(true);

  const MAX_SELECTIONS = 3;

  // Fetch interests and subcategories from DB on mount
  useEffect(() => {
    const fetchOnboardingData = async () => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOnboardingData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // STRICT STATE MACHINE: Use onboarding_step (not counts) for routing
  // Middleware already enforces access, but we do a defensive check here
  useEffect(() => {
    if (user) {
      const currentStep = user.profile?.onboarding_step;
      
      // If onboarding is complete, redirect to home
      if (user.profile?.onboarding_complete === true) {
        console.log('[DealBreakersPage] Onboarding complete, redirecting to home');
        router.replace('/home');
        return;
      }
      
      // If user is on 'interests' or 'subcategories' step, they shouldn't be here yet
      // Redirect to their required step (middleware should have caught this, but defensive check)
      if (currentStep === 'interests' || currentStep === 'subcategories') {
        console.log('[DealBreakersPage] User must complete previous steps first, redirecting:', {
          currentStep
        });
        
        const stepToRoute: Record<string, string> = {
          'interests': '/interests',
          'subcategories': '/subcategories',
          'deal-breakers': '/deal-breakers',
          'complete': '/complete',
        };
        
        const requiredRoute = stepToRoute[currentStep] || '/interests';
        router.replace(requiredRoute);
        return;
      }
      
      // Allow access if:
      // - currentStep is 'deal-breakers' (correct step)
      // - currentStep is 'complete' (can go back to deal-breakers)
      // - currentStep is null/undefined (defaults to interests, but middleware handles this)
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
      // Validate data before sending
      if (!interests || interests.length === 0) {
        throw new Error('Interests are required. Please go back and select interests first.');
      }

      if (!subcategoryData || subcategoryData.length === 0) {
        if (subcategories.length === 0) {
          throw new Error('Subcategories are required. Please go back and select subcategories first.');
        }
        // Fallback: reconstruct from subcategory IDs
        console.warn('[DealBreakers] Using fallback subcategory data construction');
      }

      const finalSubcategories = subcategoryData.length > 0 
        ? subcategoryData 
        : subcategories.map(subId => {
            const interestId = getInterestIdForSubcategory(subId);
            if (!interestId) {
              console.error('[DealBreakers] Missing interest_id for subcategory:', subId);
            }
            return {
              subcategory_id: subId,
              interest_id: interestId || 'food-drink' // fallback
            };
          }).filter(sub => sub.subcategory_id && sub.interest_id);

      const requestData = {
        step: 'deal-breakers', // Save data but don't mark as complete yet - that happens on /complete page
        interests: interests,
        subcategories: finalSubcategories,
        dealbreakers: selectedDealbreakers || []
      };

      console.log('[DealBreakers] Sending onboarding data:', {
        ...requestData,
        interestsCount: requestData.interests.length,
        subcategoriesCount: requestData.subcategories.length,
        dealbreakersCount: requestData.dealbreakers.length,
      });

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
        let errorMessage = 'Failed to save onboarding data';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('[DealBreakers] API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
        } catch (parseError) {
          console.error('[DealBreakers] Failed to parse error response:', parseError);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json().catch(() => ({}));
      console.log('[DealBreakers] Save successful:', responseData);

      // Refresh user data after successful save to update profile counts
      await refreshUser();

      const navStart = performance.now();

      // Navigate after successful save
      router.replace('/complete');
      
      // Force refresh to clear Next.js cache and ensure middleware sees updated profile
      router.refresh();

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
  }, [interests, subcategories, subcategoryData, selectedDealbreakers, getInterestIdForSubcategory, router, refreshUser, showToast]);

  const canProceed = selectedDealbreakers.length > 0 && !isNavigating;

  // Show skeleton while loading
  if (loading) {
    return (
      <>
        <DealBreakerStyles />
        <OnboardingLayout step={3} backHref={backHref}>
          <DealBreakerHeader />
          <div className="enter-fade">
            <DealBreakerSelection selectedCount={0} maxSelections={MAX_SELECTIONS}>
              <DealBreakerGridSkeleton />
            </DealBreakerSelection>
            <DealBreakerActions
              canProceed={false}
              isNavigating={false}
              selectedCount={0}
              onComplete={() => {}}
            />
          </div>
        </OnboardingLayout>
      </>
    );
  }

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
        <>
          <DealBreakerStyles />
          <OnboardingLayout step={3} backHref="/subcategories">
            <DealBreakerHeader />
            <div className="enter-fade">
              <DealBreakerSelection selectedCount={0} maxSelections={3}>
                <DealBreakerGridSkeleton />
              </DealBreakerSelection>
              <DealBreakerActions
                canProceed={false}
                isNavigating={false}
                selectedCount={0}
                onComplete={() => {}}
              />
            </div>
          </OnboardingLayout>
        </>
      }>
        <DealBreakersContent />
      </Suspense>
    </ProtectedRoute>
  );
}
