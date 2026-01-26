/**
 * SIMPLIFIED ONBOARDING ACCESS
 *
 * Single source of truth: profiles.onboarding_complete (boolean)
 *
 * This utility is now simplified. The middleware handles all guard logic.
 * This file provides helper functions for components that need to check
 * onboarding state client-side.
 *
 * Rules:
 * 1. onboarding_complete = true → user has finished, block onboarding routes
 * 2. onboarding_complete = false → user must complete onboarding
 * 3. Business accounts never use personal onboarding (handled in middleware)
 */

export type OnboardingStep = 'interests' | 'subcategories' | 'deal-breakers' | 'complete';
export type OnboardingRoute = '/interests' | '/subcategories' | '/deal-breakers' | '/complete';

interface Profile {
  onboarding_complete: boolean | null;
  onboarding_step?: OnboardingStep | null;
}

interface OnboardingAccess {
  isComplete: boolean;
  canAccessOnboardingRoutes: boolean;
  shouldRedirectTo: string | null;
}

/**
 * Onboarding routes that require incomplete onboarding to access
 */
const ONBOARDING_ROUTES = ['/interests', '/subcategories', '/deal-breakers', '/complete'];

/**
 * Check if a pathname is an onboarding route
 */
export function isOnboardingRoute(pathname: string): boolean {
  return ONBOARDING_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Get onboarding access for a user
 *
 * @param profile - User's profile (can be null if not loaded)
 * @returns Object with access information
 */
export function getOnboardingAccess(profile: Profile | null): OnboardingAccess {
  // If no profile, treat as incomplete
  const isComplete = profile?.onboarding_complete === true;

  return {
    isComplete,
    // Users with incomplete onboarding CAN access onboarding routes
    // Users with complete onboarding CANNOT access onboarding routes
    canAccessOnboardingRoutes: !isComplete,
    // Redirect destination for completed users trying to access onboarding
    shouldRedirectTo: isComplete ? '/home' : null,
  };
}

/**
 * Check if user should be redirected from current route
 *
 * @param profile - User's profile
 * @param pathname - Current pathname
 * @param isBusinessAccount - Whether user is a business account
 * @returns Redirect destination or null if no redirect needed
 */
export function getOnboardingRedirect(
  profile: Profile | null,
  pathname: string,
  isBusinessAccount: boolean = false
): string | null {
  // Business accounts never see onboarding
  if (isBusinessAccount && isOnboardingRoute(pathname)) {
    return '/my-businesses';
  }

  const isComplete = profile?.onboarding_complete === true;
  const isOnboarding = isOnboardingRoute(pathname);

  // Completed user on onboarding route → redirect to home
  if (isComplete && isOnboarding) {
    return '/home';
  }

  // Incomplete user on protected (non-onboarding) route → redirect to interests
  // Note: This is primarily handled by middleware, but useful for client-side checks
  if (!isComplete && !isOnboarding && pathname !== '/') {
    return '/interests';
  }

  return null;
}

/**
 * Helper: Get the route for a given step (for backward compatibility)
 */
export function getRouteForStep(step: OnboardingStep): OnboardingRoute {
  const STEP_TO_ROUTE: Record<OnboardingStep, OnboardingRoute> = {
    'interests': '/interests',
    'subcategories': '/subcategories',
    'deal-breakers': '/deal-breakers',
    'complete': '/complete',
  };
  return STEP_TO_ROUTE[step];
}

/**
 * Helper: Get the step for a given route
 */
export function getStepForRouteHelper(pathname: string): OnboardingStep | null {
  const ROUTE_TO_STEP: Record<string, OnboardingStep> = {
    '/interests': 'interests',
    '/subcategories': 'subcategories',
    '/deal-breakers': 'deal-breakers',
    '/complete': 'complete',
  };
  return ROUTE_TO_STEP[pathname] || null;
}

