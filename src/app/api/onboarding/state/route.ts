/**
 * GET /api/onboarding/state
 *
 * Returns current onboarding state for authenticated user.
 * This is the single source of truth for onboarding progress.
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch onboarding state from database
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

    if (profileError) {
      console.error('[OnboardingState API] Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch onboarding state' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Return fresh state
    const state = {
      onboarding_step: profile.onboarding_step || 'interests',
      onboarding_complete: profile.onboarding_complete || false,
      interests_count: profile.interests_count || 0,
      subcategories_count: profile.subcategories_count || 0,
      dealbreakers_count: profile.dealbreakers_count || 0,
      user_id: user.id
    };

    return NextResponse.json(
      { state },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('[OnboardingState API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
