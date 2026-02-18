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

        // Let middleware own onboarding step enforcement.
        // This prevents client-side stale profile data from skipping the complete page.
        if (!cancelled) {
          setHasVerified(true);
          setIsVerifying(false);
          console.log('[useCompletePage] Access verified, allowing page to handle navigation');
        }
      } catch (error) {
        console.error('[Complete] Error verifying access:', error);
        // On error, fail closed to login.
        if (!cancelled) {
          setError('Failed to verify access');
          setHasVerified(true);
          setIsVerifying(false);
          router.replace('/login');
        }
      }
    };

    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router, hasVerified]);

  // Navigate based on user role
  const handleContinue = useCallback(() => {
    try {
      // Get user's current role from profile
      const currentRole = user?.profile?.account_role || 'user';
      
      console.log('[useCompletePage] Navigating with role:', currentRole);
      
      // Route based on role:
      // - business_owner → /claim-business (to set up business profile)
      // - user (personal) → /home (browse and review businesses)
      const destination = currentRole === 'business_owner' ? '/claim-business' : '/home';
      
      router.replace(destination);
    } catch (error) {
      console.error('[useCompletePage] Error navigating:', error);
      // Fallback to /home if something goes wrong
      router.replace('/home');
    }
  }, [user, router]);

  return {
    isVerifying,
    error,
    handleContinue,
    interests,
    subcategories,
    dealbreakers,
  };
}


