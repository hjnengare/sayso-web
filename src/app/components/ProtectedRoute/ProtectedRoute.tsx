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
  const onboardingComplete = !!user?.profile?.onboarding_completed_at;
  const interestsCount = user?.profile?.interests_count ?? 0;
  const subcategoriesCount = user?.profile?.subcategories_count ?? 0;
  const dealbreakersCount = user?.profile?.dealbreakers_count ?? 0;

  // CRITICAL: Extract user role for business vs personal routing
  // Check account_role FIRST (this is what gets updated by sync logic)
  // Then check role as fallback. If EITHER is business_owner, treat as business owner.
  const currentRole = user?.profile?.account_role;
  const role = user?.profile?.role;
  const isBusinessOwner = currentRole === 'business_owner' || role === 'business_owner';
  const userRole = isBusinessOwner ? 'business_owner' : (currentRole ?? role ?? null);

  // Define personal onboarding routes that business owners should NOT access
  const personalOnboardingRoutes = ['/interests', '/subcategories', '/deal-breakers', '/complete'];

  useEffect(() => {
    console.log('[ProtectedRoute] useEffect triggered', {
      isLoading,
      isVerifiedFromUrl,
      pathname,
      userId: !!userId,
      emailVerified,
      onboardingStep,
      onboardingComplete,
      userRole,
      isBusinessOwner,
      // Raw role values for debugging
      rawCurrentRole: currentRole,
      rawRole: role
    });

    // CRITICAL: Always wait for auth to fully load before making routing decisions
    // This prevents race conditions where business users get redirected to personal onboarding
    // Even with URL verification signal, we need to know the user's role first
    if (isLoading) {
      console.log('[ProtectedRoute] Still loading auth state, waiting for full user context...');
      return; // Wait for auth state to FULLY load including role
    }

    // CRITICAL: Business owners must NEVER access personal onboarding routes
    // This check runs FIRST before any other routing logic
    const isOnPersonalOnboardingRoute = personalOnboardingRoutes.some(route => pathname === route);
    if (isBusinessOwner && isOnPersonalOnboardingRoute) {
      // Business owners must never access personal onboarding
      console.log('[ProtectedRoute] Business owner on personal onboarding route, redirecting to /my-businesses');
      router.replace('/my-businesses');
      return;
    }

    console.log('ProtectedRoute: Checking route protection', {
      requiresAuth,
      user_exists: !!userId,
      email_verified: emailVerified,
      onboarding_step: onboardingStep,
      onboarding_complete: onboardingComplete,
      userRole,
      isBusinessOwner
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
        // Business owners skip personal onboarding entirely
        if (isBusinessOwner) {
          console.log('ProtectedRoute: Business owner with incomplete onboarding, redirecting to /my-businesses');
          router.replace('/my-businesses');
          return;
        }

        // Only personal users get routed to onboarding steps
        console.log('ProtectedRoute: Personal user onboarding incomplete, redirecting to /interests');
        router.replace('/interests');
        return;
      }
    }

    // If user is logged in but route doesn't require auth (e.g., login/register pages)
    if (!requiresAuth && userId) {
      console.log('ProtectedRoute: User on non-auth route, checking redirects', { isBusinessOwner, userRole });

      // Check if user is coming from successful email verification
      const emailVerifiedFromUrl = searchParams.get('email_verified') === 'true';
      const verifiedFromUrl = searchParams.get('verified') === '1';

      // CRITICAL: Handle business owners separately from personal users
      if (isBusinessOwner) {
        if (!emailVerified && !emailVerifiedFromUrl && !verifiedFromUrl) {
          if (pathname !== '/verify-email') {
            console.log('ProtectedRoute: Business owner email not verified, redirecting to verify-email');
            router.replace('/verify-email');
          }
        } else {
          // Business owner with verified email - always go to /my-businesses
          if (pathname !== '/my-businesses' && pathname !== '/claim-business') {
            console.log('ProtectedRoute: Business owner verified, redirecting to /my-businesses');
            router.replace('/my-businesses');
          }
        }
        return;
      }

      // Personal user flow
      if (onboardingComplete) {
        // Only redirect if not already on /complete
        if (pathname !== '/complete') {
          console.log('ProtectedRoute: Personal user onboarding complete, redirecting to complete');
          router.replace('/complete');
        }
      } else if (!emailVerified && !emailVerifiedFromUrl && !verifiedFromUrl) {
        // Only redirect if not already on verify-email
        if (pathname !== '/verify-email') {
          console.log('ProtectedRoute: Personal user email not verified, redirecting to verify-email');
          router.replace('/verify-email');
        }
      } else {
        console.log('ProtectedRoute: Personal user email verified, redirecting to /interests');
        if (pathname !== '/interests') {
          router.replace('/interests');
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

    // If user has completed onboarding but is trying to access onboarding pages, redirect appropriately
    // BUT allow access to /complete page (the celebration page that shows confetti) for personal users
    // Check if current route is an onboarding route
    const onboardingRoutes = ['/onboarding', '/interests', '/subcategories', '/deal-breakers', '/complete'];
    const isOnboardingRoute = onboardingRoutes.some(route => pathname === route || pathname?.startsWith(route + '/'));

    // CRITICAL: Business owners should never be on personal onboarding routes
    if (userId && isBusinessOwner && isOnboardingRoute) {
      console.log('ProtectedRoute: Business owner on onboarding route, redirecting to /my-businesses');
      router.replace('/my-businesses');
      return;
    }

    // Allow access to /complete page even if onboarding is complete (it's the celebration page) - personal users only
    if (userId && !isBusinessOwner && onboardingComplete && isOnboardingRoute && pathname !== '/complete') {
      console.log('ProtectedRoute: Personal user completed onboarding, redirecting from onboarding route to complete');
      router.push('/complete');
      return;
    }

    if (userId && !isBusinessOwner && !onboardingComplete && pathname === '/complete') {
      console.log('ProtectedRoute: Incomplete personal user on /complete, redirecting to /onboarding');
      router.push('/onboarding');
      return;
    }

    // Legacy check for allowedOnboardingSteps (personal users only)
    if (userId && !isBusinessOwner && onboardingComplete && allowedOnboardingSteps.length > 0) {
      router.push('/complete');
      return;
    }
  }, [userId, emailVerified, onboardingStep, onboardingComplete, interestsCount, subcategoriesCount, dealbreakersCount, isLoading, router, pathname, requiresAuth, requiresOnboarding, allowedOnboardingSteps, redirectTo, searchParams, userRole, isBusinessOwner, personalOnboardingRoutes, currentRole, role]);

  // CRITICAL: Always show loading state while auth is resolving
  // We MUST wait for the full user context (including role) before rendering
  // This prevents race conditions where business users briefly see personal onboarding
  if (isLoading) {
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

