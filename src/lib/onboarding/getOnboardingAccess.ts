/**
 * STRICT ONBOARDING STATE MACHINE
 * 
 * Single source of truth for onboarding routing logic.
 * Uses ONLY profiles.onboarding_step (never counts) for routing decisions.
 * 
 * State machine:
 * - 'interests' -> user must complete interests
 * - 'subcategories' -> user must complete subcategories
 * - 'deal-breakers' -> user must complete deal-breakers
 * - 'complete' -> user can access /complete page
 * 
 * Transition rules (only in API routes after successful save):
 * - Save interests => set onboarding_step = 'subcategories'
 * - Save subcategories => set onboarding_step = 'deal-breakers'
 * - Save deal-breakers => set onboarding_step = 'complete'
 * - Finish complete screen => set onboarding_complete=true
 */

export type OnboardingStep = 'interests' | 'subcategories' | 'deal-breakers' | 'complete';
export type OnboardingRoute = '/interests' | '/subcategories' | '/deal-breakers' | '/complete';

interface Profile {
  onboarding_step: OnboardingStep | null;
  onboarding_complete: boolean | null;
}

interface OnboardingAccess {
  step: OnboardingStep;
  currentRoute: OnboardingRoute;
  canAccess(pathname: string): boolean;
  redirectFor(pathname: string): OnboardingRoute | null;
}

/**
 * Step order for comparison (earlier = lower index)
 */
const STEP_ORDER: OnboardingStep[] = ['interests', 'subcategories', 'deal-breakers', 'complete'];

/**
 * Route to step mapping
 */
const ROUTE_TO_STEP: Record<string, OnboardingStep> = {
  '/interests': 'interests',
  '/subcategories': 'subcategories',
  '/deal-breakers': 'deal-breakers',
  '/complete': 'complete',
};

/**
 * Step to route mapping
 */
const STEP_TO_ROUTE: Record<OnboardingStep, OnboardingRoute> = {
  'interests': '/interests',
  'subcategories': '/subcategories',
  'deal-breakers': '/deal-breakers',
  'complete': '/complete',
};

/**
 * Get the required onboarding step from profile
 * Defaults to 'interests' if step is null/missing
 */
function getRequiredStep(profile: Profile | null): OnboardingStep {
  if (!profile) {
    return 'interests';
  }
  
  const step = profile.onboarding_step;
  
  // Default to 'interests' if step is null, undefined, or invalid
  if (!step || !STEP_ORDER.includes(step as OnboardingStep)) {
    return 'interests';
  }
  
  return step as OnboardingStep;
}

/**
 * Compare two steps - returns:
 * - negative if step1 is earlier than step2
 * - 0 if equal
 * - positive if step1 is later than step2
 */
function compareSteps(step1: OnboardingStep, step2: OnboardingStep): number {
  const index1 = STEP_ORDER.indexOf(step1);
  const index2 = STEP_ORDER.indexOf(step2);
  return index1 - index2;
}

/**
 * Check if a pathname is an onboarding route
 */
function isOnboardingRoute(pathname: string): boolean {
  return pathname in ROUTE_TO_STEP;
}

/**
 * Get the step for a given pathname
 */
function getStepForRoute(pathname: string): OnboardingStep | null {
  return ROUTE_TO_STEP[pathname] || null;
}

/**
 * Main function: Get onboarding access control
 * 
 * Rules:
 * 1. If onboarding_complete=true: block all onboarding routes, redirect to /home
 * 2. If onboarding_complete=false:
 *    - Determine requiredStep from onboarding_step (default: 'interests')
 *    - If pathname is a later step than requiredStep -> redirect to requiredStep (NO SKIP)
 *    - If pathname is earlier step -> allow (back navigation)
 *    - If pathname is requiredStep -> allow
 *    - If pathname is unrelated (like /home) while incomplete -> redirect to requiredStep
 */
export function getOnboardingAccess(profile: Profile | null): OnboardingAccess {
  const requiredStep = getRequiredStep(profile);
  const currentRoute = STEP_TO_ROUTE[requiredStep];
  const isComplete = profile?.onboarding_complete === true;

  /**
   * Check if user can access a given pathname
   */
  function canAccess(pathname: string): boolean {
    // If onboarding is complete, block all onboarding routes
    if (isComplete) {
      return !isOnboardingRoute(pathname);
    }

    // If not an onboarding route, allow (let other middleware handle it)
    if (!isOnboardingRoute(pathname)) {
      return true;
    }

    const requestedStep = getStepForRoute(pathname);
    if (!requestedStep) {
      return true; // Not an onboarding route we know about
    }

    // Allow if:
    // 1. User is on their required step (currentStep === requiredStep)
    // 2. User is going backward (requestedStep is earlier than requiredStep)
    const stepComparison = compareSteps(requestedStep, requiredStep);
    
    return stepComparison <= 0; // Allow current step or earlier steps
  }

  /**
   * Get redirect route for a given pathname (or null if no redirect needed)
   */
  function redirectFor(pathname: string): OnboardingRoute | null {
    // If onboarding is complete, redirect onboarding routes to /home (handled elsewhere)
    if (isComplete && isOnboardingRoute(pathname)) {
      return null; // Let middleware redirect to /home
    }

    // If not an onboarding route, no redirect needed
    if (!isOnboardingRoute(pathname)) {
      return null;
    }

    const requestedStep = getStepForRoute(pathname);
    if (!requestedStep) {
      return null; // Not an onboarding route we know about
    }

    // If user is trying to skip ahead, redirect to required step
    const stepComparison = compareSteps(requestedStep, requiredStep);
    if (stepComparison > 0) {
      // User is trying to access a later step - redirect to required step
      return currentRoute;
    }

    // Allow access (current step or earlier)
    return null;
  }

  return {
    step: requiredStep,
    currentRoute,
    canAccess,
    redirectFor,
  };
}

/**
 * Helper: Get the route for a given step
 */
export function getRouteForStep(step: OnboardingStep): OnboardingRoute {
  return STEP_TO_ROUTE[step];
}

/**
 * Helper: Get the step for a given route
 */
export function getStepForRouteHelper(pathname: string): OnboardingStep | null {
  return getStepForRoute(pathname);
}

