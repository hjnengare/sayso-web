/**
 * Onboarding V2 - Server-side State Management
 *
 * Functions for fetching onboarding state from the database.
 * Always fresh, no caching.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { OnboardingState } from './state';

/**
 * Fetches current onboarding state from database
 * This is the ONLY source of truth for onboarding state
 *
 * @returns OnboardingState or null if not authenticated
 */
export async function fetchOnboardingState(): Promise<OnboardingState | null> {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component context, cookies are read-only
          }
        },
      },
    }
  );

  // Get authenticated user
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Fetch onboarding state from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      onboarding_step,
      onboarding_complete,
      interests_count,
      subcategories_count,
      dealbreakers_count
    `)
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('[OnboardingV2] Error fetching profile:', profileError);
    return null;
  }

  return {
    onboarding_step: profile.onboarding_step as any,
    onboarding_complete: profile.onboarding_complete || false,
    interests_count: profile.interests_count || 0,
    subcategories_count: profile.subcategories_count || 0,
    dealbreakers_count: profile.dealbreakers_count || 0,
    user_id: user.id
  };
}

/**
 * Verifies that the current state matches expected step
 * Used in page components to ensure they're rendering for the correct step
 */
export async function verifyStepAccess(
  expectedStep: string
): Promise<{ allowed: boolean; redirectTo: string | null }> {
  const state = await fetchOnboardingState();

  if (!state) {
    return { allowed: false, redirectTo: '/login' };
  }

  // If onboarding complete, only allow /complete celebration
  if (state.onboarding_complete) {
    if (expectedStep === 'complete') {
      return { allowed: true, redirectTo: null };
    }
    return { allowed: false, redirectTo: '/home' };
  }

  // Check if user can access this step
  const currentIndex = ['interests', 'subcategories', 'deal-breakers', 'complete'].indexOf(
    state.onboarding_step
  );
  const requestedIndex = ['interests', 'subcategories', 'deal-breakers', 'complete'].indexOf(
    expectedStep
  );

  // Can access current or previous steps
  if (requestedIndex <= currentIndex) {
    return { allowed: true, redirectTo: null };
  }

  // Trying to skip ahead - redirect to current step
  const stepRoutes: Record<string, string> = {
    interests: '/interests',
    subcategories: '/subcategories',
    'deal-breakers': '/deal-breakers',
    complete: '/complete'
  };

  return {
    allowed: false,
    redirectTo: stepRoutes[state.onboarding_step] || '/interests'
  };
}
