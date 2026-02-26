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
  const onboardingStatusKnown = !!user?.profile;
  const onboardingStep = user?.profile?.onboarding_step ?? null;
  const onboardingComplete = onboardingStatusKnown && !!user?.profile?.onboarding_completed_at;
  const interestsCount = user?.profile?.interests_count ?? 0;
  const subcategoriesCount = user?.profile?.subcategories_count ?? 0;
  const dealbreakersCount = user?.profile?.dealbreakers_count ?? 0;

  // CRITICAL: Extract user role for admin / business / personal routing
  // Check account_role FIRST (this is what gets updated by sync logic)
  // Then check role as fallback.
  const currentRole = user?.profile?.account_role;
  const role = user?.profile?.role;
  const isAdmin = currentRole === 'admin' || role === 'admin';
  const isBusinessOwner = !isAdmin && (currentRole === 'business_owner' || role === 'business_owner');
  const userRole = isAdmin ? 'admin' : isBusinessOwner ? 'business_owner' : (currentRole ?? role ?? null);

  // Define personal onboarding routes that business owners should NOT access
  const personalOnboardingRoutes = ['/interests', '/subcategories', '/deal-breakers', '/complete'];

  useEffect(() => {
    // Three states: loading → show loader (no logic); unauthenticated → redirect; authenticated → run role/onboarding logic.
    // Never run protection logic or call APIs until auth is fully resolved (avoids 401s and redirect loops).
    if (isLoading) {
      return;
    }

    // CRITICAL: Race-condition safety guard.
    // If user exists but profile data hasn't loaded yet, DO NOT run any redirect logic.
    // This prevents false redirects during the profile sync window after email verification.
    if (userId && !onboardingStatusKnown) {
      console.log('[ProtectedRoute] Profile not ready, skipping all redirects (race condition guard)');
      return;
    }

    // CRITICAL: Admin users must ONLY access /admin routes
    const isOnAdminRoute = pathname?.startsWith('/admin');
    if (isAdmin && userId && !isOnAdminRoute) {
      console.log('[ProtectedRoute] Admin on non-admin route, redirecting to /admin');
      router.replace('/admin');
      return;
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

    // If authentication is required and user is not logged in
    if (requiresAuth && !userId) {
      console.log('[ProtectedRoute] No user, redirecting to login');
      router.push(redirectTo || '/login');
      return;
    }

    // CRITICAL: Block access to /home unless email is verified AND onboarding is complete
    // Only redirect if we're actually on /home, not if we're already being redirected
    // NOTE: /home is generally public, so this logic mainly applies to authenticated users
    if (requiresAuth && userId && pathname === '/home') {
      if (!emailVerified) {
        console.log('[ProtectedRoute] Email not verified on /home, redirecting to verify-email');
        router.replace('/verify-email');
        return;
      }

      // CRITICAL: Only redirect if we have CONFIRMED incomplete status.
      // onboardingStatusKnown is already checked above, so at this point we know the profile exists.
      if (!onboardingComplete) {
        // Business owners skip personal onboarding entirely
        if (isBusinessOwner) {
          console.log('[ProtectedRoute] Business owner with incomplete onboarding, redirecting to /my-businesses');
          router.replace('/my-businesses');
          return;
        }

        // Only personal users get routed to onboarding steps
        console.log('[ProtectedRoute] Personal user onboarding incomplete on /home, redirecting to /interests');
        router.replace('/interests');
        return;
      }
    }

    // If user is logged in but route doesn't require auth (e.g., login/register pages)
    if (!requiresAuth && userId) {
      // Check if user is coming from successful email verification
      const emailVerifiedFromUrl = searchParams.get('email_verified') === 'true';
      const verifiedFromUrl = searchParams.get('verified') === '1';

      // CRITICAL: Admin accounts always go to /admin
      if (isAdmin) {
        if (!emailVerified && !emailVerifiedFromUrl && !verifiedFromUrl) {
          if (pathname !== '/verify-email') {
            console.log('[ProtectedRoute] Admin email not verified, redirecting to verify-email');
            router.replace('/verify-email');
          }
        } else if (!isOnAdminRoute) {
          console.log('[ProtectedRoute] Admin verified, redirecting to /admin');
          router.replace('/admin');
        }
        return;
      }

      // CRITICAL: Handle business owners separately from personal users
      if (isBusinessOwner) {
        if (!emailVerified && !emailVerifiedFromUrl && !verifiedFromUrl) {
          if (pathname !== '/verify-email') {
            console.log('[ProtectedRoute] Business owner email not verified, redirecting to verify-email');
            router.replace('/verify-email');
          }
        } else {
          // Business owner with verified email - always go to /my-businesses
          // CRITICAL: Don't redirect if already on business-related routes
          const businessRoutes = ['/my-businesses', '/claim-business', '/add-business', '/add-special', '/add-event'];
          const isOnBusinessRoute = businessRoutes.some(route => pathname?.startsWith(route));
          if (!isOnBusinessRoute) {
            console.log('[ProtectedRoute] Business owner verified, redirecting to /my-businesses');
            router.replace('/my-businesses');
          }
        }
        return;
      }

      // Personal user flow
      if (onboardingComplete) {
        // Only redirect if not already on /complete or /home
        // This prevents redirect loops - completed users can access both
        if (pathname !== '/complete' && pathname !== '/home') {
          console.log('[ProtectedRoute] Personal user onboarding complete, redirecting to /home');
          router.replace('/home');
        }
      } else if (!emailVerified && !emailVerifiedFromUrl && !verifiedFromUrl) {
        // Only redirect if not already on verify-email
        if (pathname !== '/verify-email') {
          console.log('[ProtectedRoute] Personal user email not verified, redirecting to verify-email');
          router.replace('/verify-email');
        }
      } else {
        // Email verified but onboarding incomplete
        // CRITICAL: Only redirect if not already on an onboarding route
        const onboardingPaths = ['/interests', '/subcategories', '/deal-breakers', '/onboarding'];
        const isOnOnboardingPath = onboardingPaths.some(route => pathname === route);
        if (!isOnOnboardingPath) {
          console.log('[ProtectedRoute] Personal user email verified, redirecting to /interests');
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
      console.log('[ProtectedRoute] Business owner on onboarding route, redirecting to /my-businesses');
      router.replace('/my-businesses');
      return;
    }

    // Allow access to /complete page even if onboarding is complete (it's the celebration page) - personal users only
    // But redirect from other onboarding routes to /home if already complete
    if (userId && !isBusinessOwner && onboardingComplete && isOnboardingRoute && pathname !== '/complete') {
      console.log('[ProtectedRoute] Personal user completed onboarding, redirecting from onboarding route to /home');
      router.replace('/home');
      return;
    }

    // Legacy check for allowedOnboardingSteps (personal users only)
    if (userId && !isBusinessOwner && onboardingComplete && allowedOnboardingSteps.length > 0) {
      router.push('/complete');
      return;
    }
  }, [userId, emailVerified, onboardingStatusKnown, onboardingStep, onboardingComplete, interestsCount, subcategoriesCount, dealbreakersCount, isLoading, router, pathname, requiresAuth, requiresOnboarding, allowedOnboardingSteps, redirectTo, searchParams, userRole, isAdmin, isBusinessOwner, personalOnboardingRoutes, currentRole, role]);

  // State 1: loading — show loader; do not render children or run any checks (avoids 401s from children calling APIs before session is ready)
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-off-white">
        <PageLoader size="lg" variant="wavy" color="sage" />
      </div>
    );
  }

  // State 2 & 3: unauthenticated → redirect handled in useEffect; authenticated → run role/onboarding logic in useEffect

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

