/**
 * useCompletePage Hook (Simplified - Read-only summary page)
 * Encapsulates verification and navigation for the complete page
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';

export interface UseCompletePageReturn {
  isVerifying: boolean;
  error: string | null;
  handleContinue: () => void;
  interests: string[];
  subcategories: string[];
  dealbreakers: string[];
}

export function useCompletePage(): UseCompletePageReturn {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const {
    selectedInterests,
    selectedSubInterests,
    selectedDealbreakers,
  } = useOnboarding();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVerified, setHasVerified] = useState(false);

  // Get data from localStorage (OnboardingContext)
  const interests: string[] = selectedInterests || [];
  const subcategories: string[] = selectedSubInterests || [];
  const dealbreakers: string[] = selectedDealbreakers || [];

  // Verify user is at correct step and redirect if not
  useEffect(() => {
    let cancelled = false;

    const verifyAccess = async () => {
      // Only verify once to prevent re-render loops
      if (hasVerified) {
        return;
      }

      try {
        // Wait for auth to load
        if (authLoading) {
          return;
        }

        // No user - redirect to login
        if (!user) {
          if (!cancelled) {
            setHasVerified(true);
            setIsVerifying(false);
            router.replace('/login');
          }
          return;
        }

        const onboardingStep = user.profile?.onboarding_step;
        const onboardingComplete = user.profile?.onboarding_complete;

        // If onboarding already completed, stay on complete page for celebration
        // Let the page handle navigation based on role
        if (onboardingComplete) {
          if (!cancelled) {
            setHasVerified(true);
            setIsVerifying(false);
            console.log('[useCompletePage] Onboarding complete, allowing page to handle navigation');
          }
          return;
        }

        // Not at complete step yet - redirect to correct step
        if (onboardingStep !== 'complete') {
          const nextRoute = onboardingStep === 'interests' ? '/interests'
            : onboardingStep === 'subcategories' ? '/subcategories'
            : onboardingStep === 'deal-breakers' ? '/deal-breakers'
            : '/interests';
          if (!cancelled) {
            setHasVerified(true);
            setIsVerifying(false);
            router.replace(nextRoute);
          }
          return;
        }

        // User is at correct step - allow access
        if (!cancelled) {
          setHasVerified(true);
          setIsVerifying(false);
        }
      } catch (error) {
        console.error('[Complete] Error verifying access:', error);
        // On error, redirect to start of onboarding
        if (!cancelled) {
          setHasVerified(true);
          setIsVerifying(false);
          router.replace('/interests');
        }
      }
    };

    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router, hasVerified]);

  // Simple navigation to home - no saving needed
  const handleContinue = useCallback(() => {
    try {
      console.log('[useCompletePage] Checking user role before navigation');
      console.log('[useCompletePage] User profile:', {
        has_profile: !!user?.profile,
        role: user?.profile?.role,
        current_role: user?.profile?.current_role
      });
      
      // Safely access user role - default to 'user' if not set
      const userRole = user?.profile?.current_role || user?.profile?.role || 'user';
      console.log('[useCompletePage] Resolved user role:', userRole);
      
      // Business owners go to /claim-business, personal users go to /home
      const destination = userRole === 'business_owner' ? '/claim-business' : '/home';
      
      console.log('[useCompletePage] Navigating to:', destination);
      router.push(destination);
    } catch (error) {
      console.error('[useCompletePage] Error with router.push:', error);
      // Fallback: use window.location for immediate hard redirect
      try {
        if (typeof window !== 'undefined') {
          // Safe fallback - always try /home first, easier to redirect from there
          console.log('[useCompletePage] Using window.location.href fallback to /home');
          window.location.href = '/home';
        }
      } catch (fallbackError) {
        console.error('[useCompletePage] Fallback also failed:', fallbackError);
      }
    }
  }, [router, user?.profile?.current_role, user?.profile?.role]);

  return {
    isVerifying,
    error,
    handleContinue,
    interests,
    subcategories,
    dealbreakers,
  };
}

