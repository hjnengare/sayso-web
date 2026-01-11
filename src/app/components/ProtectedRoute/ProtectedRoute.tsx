"use client";

import { useEffect, ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from '../Loader';

interface ProtectedRouteProps {
  children: ReactNode;
  requiresAuth?: boolean;
  requiresOnboarding?: boolean;
  allowedOnboardingSteps?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiresAuth = true,
  requiresOnboarding = false,
  allowedOnboardingSteps = [],
  redirectTo
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Optimistic check: if URL indicates verification, don't block on loading
  const emailVerifiedParam = searchParams?.get('email_verified') === 'true';
  const verifiedParam = searchParams?.get('verified') === '1';
  const isVerifiedFromUrl = emailVerifiedParam || verifiedParam;

  // Extract stable primitives to prevent re-render loops
  const userId = user?.id ?? null;
  const emailVerified = user?.email_verified ?? false;
  const onboardingStep = user?.profile?.onboarding_step ?? null;
  const onboardingComplete = user?.profile?.onboarding_complete ?? false;
  const interestsCount = user?.profile?.interests_count ?? 0;
  const subcategoriesCount = user?.profile?.subcategories_count ?? 0;
  const dealbreakersCount = user?.profile?.dealbreakers_count ?? 0;

  useEffect(() => {
    // Don't block if we have verification signal from URL
    if (isLoading && !isVerifiedFromUrl) return; // Wait for auth state to load

    console.log('ProtectedRoute: Checking route protection', {
      requiresAuth,
      user_exists: !!userId,
      email_verified: emailVerified,
      onboarding_step: onboardingStep,
      onboarding_complete: onboardingComplete
    });

    // If authentication is required and user is not logged in
    if (requiresAuth && !userId) {
      console.log('ProtectedRoute: No user, redirecting to login');
      router.push(redirectTo || '/login');
      return;
    }

    // CRITICAL: Block access to /home unless email is verified AND onboarding is complete
    // Only redirect if we're actually on /home, not if we're already being redirected
    if (requiresAuth && userId && pathname === '/home') {
      if (!emailVerified) {
        console.log('ProtectedRoute: Email not verified, redirecting to verify-email');
        router.replace('/verify-email');
        return;
      }

      if (!onboardingComplete) {
        console.log('ProtectedRoute: Onboarding incomplete, redirecting to next step');
        // Determine next step based on what's been completed
        let nextStep = 'interests';
        if (interestsCount === 0) {
          nextStep = 'interests';
        } else if (subcategoriesCount === 0) {
          nextStep = 'subcategories';
        } else if (dealbreakersCount === 0) {
          nextStep = 'deal-breakers';
        } else {
          nextStep = 'complete';
        }

        // Use replace instead of push to prevent back button issues
        // Only redirect if we're not already on that step
        if (pathname !== `/${nextStep}`) {
          router.replace(`/${nextStep}`);
        }
        return;
      }
    }

    // If user is logged in but route doesn't require auth (e.g., login/register pages)
    if (!requiresAuth && userId) {
      console.log('ProtectedRoute: User on non-auth route, checking redirects');

      // Check if user is coming from successful email verification
      const emailVerifiedFromUrl = searchParams.get('email_verified') === 'true';
      const verifiedFromUrl = searchParams.get('verified') === '1';

      if (onboardingComplete) {
        // Only redirect if not already on home
        if (pathname !== '/home') {
          console.log('ProtectedRoute: Onboarding complete, redirecting to home');
          router.replace('/home');
        }
      } else if (!emailVerified && !emailVerifiedFromUrl && !verifiedFromUrl) {
        // Only redirect if not already on verify-email
        if (pathname !== '/verify-email') {
          console.log('ProtectedRoute: Email not verified, redirecting to verify-email');
          router.replace('/verify-email');
        }
      } else {
        console.log('ProtectedRoute: Email verified, redirecting to onboarding step');
        // User is verified, redirect to appropriate onboarding step
        let targetStep = 'interests';
        if (onboardingStep === 'start') {
          targetStep = 'interests';
        } else {
          // Determine next step based on progress
          if (interestsCount === 0) {
            targetStep = 'interests';
          } else if (subcategoriesCount === 0) {
            targetStep = 'subcategories';
          } else if (dealbreakersCount === 0) {
            targetStep = 'deal-breakers';
          } else {
            targetStep = 'complete';
          }
        }

        // Only redirect if not already on target step
        if (pathname !== `/${targetStep}`) {
          console.log('ProtectedRoute: Redirecting to', targetStep);
          router.replace(`/${targetStep}`);
        }
      }
      return;
    }

    // If onboarding is required but user hasn't completed it
    if (requiresOnboarding && userId && !onboardingComplete) {
      // Check if current step is allowed
      if (allowedOnboardingSteps.length > 0 && !allowedOnboardingSteps.includes(onboardingStep || '')) {
        router.push(`/${onboardingStep}`);
        return;
      }
    }

    // If user has completed onboarding but is trying to access onboarding pages, redirect to home
    // BUT allow access to /complete page (the celebration page that shows confetti)
    // Check if current route is an onboarding route
    const onboardingRoutes = ['/onboarding', '/interests', '/subcategories', '/deal-breakers', '/complete'];
    const isOnboardingRoute = onboardingRoutes.some(route => pathname === route || pathname?.startsWith(route + '/'));

    // Allow access to /complete page even if onboarding is complete (it's the celebration page)
    if (userId && onboardingComplete && isOnboardingRoute && pathname !== '/complete') {
      console.log('ProtectedRoute: User completed onboarding, redirecting from onboarding route to home');
      router.push('/home');
      return;
    }

    // Legacy check for allowedOnboardingSteps
    if (userId && onboardingComplete && allowedOnboardingSteps.length > 0) {
      router.push('/home');
      return;
    }
  }, [userId, emailVerified, onboardingStep, onboardingComplete, interestsCount, subcategoriesCount, dealbreakersCount, isLoading, router, pathname, requiresAuth, requiresOnboarding, allowedOnboardingSteps, redirectTo, searchParams]);

  // Show loading state while checking authentication - but allow optimistic rendering if verified
  if (isLoading && !isVerifiedFromUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-off-white">
        <PageLoader size="lg" variant="wavy" color="sage" />
      </div>
    );
  }

  // If authentication checks pass, render children
  return <>{children}</>;
}

// Convenience wrapper components
export function PublicRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiresAuth={false}>
      {children}
    </ProtectedRoute>
  );
}

export function PrivateRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiresAuth={true}>
      {children}
    </ProtectedRoute>
  );
}

export function OnboardingRoute({
  children,
  step
}: {
  children: ReactNode;
  step: string;
}) {
  return (
    <ProtectedRoute
      requiresAuth={true}
      requiresOnboarding={true}
      allowedOnboardingSteps={[step]}
    >
      {children}
    </ProtectedRoute>
  );
}
