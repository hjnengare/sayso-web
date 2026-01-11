/**
 * Onboarding V2 - State Management
 *
 * Greenfield implementation with strict backend-driven state.
 * No caching, no context, no client-side assumptions.
 */

export type OnboardingStep = 'interests' | 'subcategories' | 'deal-breakers' | 'complete';

export const STEP_ORDER: OnboardingStep[] = [
  'interests',
  'subcategories',
  'deal-breakers',
  'complete'
];

export const STEP_ROUTES: Record<OnboardingStep, string> = {
  'interests': '/interests',
  'subcategories': '/subcategories',
  'deal-breakers': '/deal-breakers',
  'complete': '/complete'
};

export interface OnboardingState {
  // Core state (from profiles table)
  onboarding_step: OnboardingStep;
  onboarding_complete: boolean;

  // Verification counts (from junction tables)
  interests_count: number;
  subcategories_count: number;
  dealbreakers_count: number;

  // User ID for context
  user_id: string;
}

export interface StepValidation {
  isCurrentStep: boolean;
  isPreviousStep: boolean;
  isFutureStep: boolean;
  canAccess: boolean;
  redirectTo: string | null;
}

/**
 * Validates if user can access a specific step
 * Rules:
 * - Can access current step
 * - Can access previous completed steps (back navigation)
 * - Cannot access future steps
 * - If onboarding_complete, redirect to /home
 */
export function validateStepAccess(
  state: OnboardingState,
  requestedStep: OnboardingStep
): StepValidation {
  // If onboarding is complete, only /complete celebration page is allowed
  if (state.onboarding_complete) {
    const canAccess = requestedStep === 'complete';
    return {
      isCurrentStep: false,
      isPreviousStep: false,
      isFutureStep: false,
      canAccess,
      redirectTo: canAccess ? null : '/home'
    };
  }

  const currentStepIndex = STEP_ORDER.indexOf(state.onboarding_step);
  const requestedStepIndex = STEP_ORDER.indexOf(requestedStep);

  const isCurrentStep = requestedStep === state.onboarding_step;
  const isPreviousStep = requestedStepIndex < currentStepIndex;
  const isFutureStep = requestedStepIndex > currentStepIndex;

  // Can access current or previous steps only
  const canAccess = isCurrentStep || isPreviousStep;

  // If trying to access future step, redirect to current step
  const redirectTo = isFutureStep ? STEP_ROUTES[state.onboarding_step] : null;

  return {
    isCurrentStep,
    isPreviousStep,
    isFutureStep,
    canAccess,
    redirectTo
  };
}

/**
 * Determines next step after successful save
 */
export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[currentIndex + 1];
}

/**
 * Validates if step prerequisites are met
 */
export function validateStepPrerequisites(
  state: OnboardingState,
  step: OnboardingStep
): { valid: boolean; error: string | null } {
  switch (step) {
    case 'interests':
      // First step, no prerequisites
      return { valid: true, error: null };

    case 'subcategories':
      // Requires at least 3 interests
      if (state.interests_count < 3) {
        return {
          valid: false,
          error: 'Please select at least 3 interests first'
        };
      }
      return { valid: true, error: null };

    case 'deal-breakers':
      // Requires interests and subcategories
      if (state.interests_count < 3) {
        return {
          valid: false,
          error: 'Please complete interests step first'
        };
      }
      if (state.subcategories_count < 1) {
        return {
          valid: false,
          error: 'Please select at least 1 subcategory first'
        };
      }
      return { valid: true, error: null };

    case 'complete':
      // Requires all previous steps
      if (state.interests_count < 3) {
        return {
          valid: false,
          error: 'Please complete interests step first'
        };
      }
      if (state.subcategories_count < 1) {
        return {
          valid: false,
          error: 'Please complete subcategories step first'
        };
      }
      if (state.dealbreakers_count < 2) {
        return {
          valid: false,
          error: 'Please complete deal-breakers step first'
        };
      }
      return { valid: true, error: null };

    default:
      return { valid: false, error: 'Unknown step' };
  }
}
