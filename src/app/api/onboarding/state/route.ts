/**
 * GET /api/onboarding/state
 *
 * Returns current onboarding state for authenticated user.
 * This is the single source of truth for onboarding progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

export const GET = withUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        onboarding_step,
        onboarding_complete,
        onboarding_completed_at,
        interests_count,
        subcategories_count,
        dealbreakers_count
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError && isSchemaCacheError(profileError)) {
      ({ data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          onboarding_step,
          onboarding_complete,
          interests_count,
          subcategories_count,
          dealbreakers_count
        `)
        .eq('user_id', user.id)
        .maybeSingle());
    }

    if (profileError) {
      console.error('[OnboardingState API] Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch onboarding state' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const state = {
      onboarding_step: profile.onboarding_step || 'interests',
      onboarding_complete: !!profile.onboarding_completed_at,
      onboarding_completed_at: profile.onboarding_completed_at ?? null,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
