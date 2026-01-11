/**
 * Onboarding V2 - Client-side Utilities
 *
 * Functions for fetching and mutating onboarding state from the client.
 * Always fetches fresh state, no caching.
 */

import type { OnboardingState, OnboardingStep } from './state';

/**
 * Fetches current onboarding state from server
 * This should be called on every page mount to ensure fresh state
 */
export async function fetchCurrentState(): Promise<OnboardingState | null> {
  try {
    const response = await fetch('/api/onboarding/state', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('[OnboardingV2] Failed to fetch state:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.state;
  } catch (error) {
    console.error('[OnboardingV2] Error fetching state:', error);
    return null;
  }
}

/**
 * Saves interests and progresses to subcategories
 */
export async function saveInterests(
  interestIds: string[]
): Promise<{ success: boolean; nextStep: OnboardingStep | null; error: string | null }> {
  try {
    const response = await fetch('/api/onboarding/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interest_ids: interestIds }),
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        nextStep: null,
        error: data.error || 'Failed to save interests'
      };
    }

    return {
      success: true,
      nextStep: 'subcategories',
      error: null
    };
  } catch (error) {
    console.error('[OnboardingV2] Error saving interests:', error);
    return {
      success: false,
      nextStep: null,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Saves subcategories and progresses to deal-breakers
 */
export async function saveSubcategories(
  subcategories: Array<{ subcategory_id: string; interest_id: string }>
): Promise<{ success: boolean; nextStep: OnboardingStep | null; error: string | null }> {
  try {
    const response = await fetch('/api/onboarding/subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subcategories }),
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        nextStep: null,
        error: data.error || 'Failed to save subcategories'
      };
    }

    return {
      success: true,
      nextStep: 'deal-breakers',
      error: null
    };
  } catch (error) {
    console.error('[OnboardingV2] Error saving subcategories:', error);
    return {
      success: false,
      nextStep: null,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Saves deal-breakers and progresses to complete
 */
export async function saveDealBreakers(
  dealbreakerIds: string[]
): Promise<{ success: boolean; nextStep: OnboardingStep | null; error: string | null }> {
  try {
    const response = await fetch('/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealbreaker_ids: dealbreakerIds }),
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        nextStep: null,
        error: data.error || 'Failed to save deal-breakers'
      };
    }

    return {
      success: true,
      nextStep: 'complete',
      error: null
    };
  } catch (error) {
    console.error('[OnboardingV2] Error saving deal-breakers:', error);
    return {
      success: false,
      nextStep: null,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Marks onboarding as complete
 */
export async function completeOnboarding(): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const response = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to complete onboarding'
      };
    }

    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('[OnboardingV2] Error completing onboarding:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Fetches user's saved selections for a step
 * Used for pre-populating forms when user goes back
 */
export async function fetchSavedSelections(step: OnboardingStep): Promise<{
  interests?: string[];
  subcategories?: Array<{ subcategory_id: string; interest_id: string }>;
  dealbreakers?: string[];
} | null> {
  try {
    const response = await fetch('/api/user/onboarding', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[OnboardingV2] Error fetching saved selections:', error);
    return null;
  }
}
