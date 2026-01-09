import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching for onboarding data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/complete
 * Marks onboarding as complete by setting onboarding_complete=true
 * 
 * IMPORTANT: This endpoint does NOT save data. Data is saved at each step:
 * - /api/onboarding/interests saves interests
 * - /api/onboarding/subcategories saves subcategories  
 * - /api/onboarding/deal-breakers saves dealbreakers
 * 
 * This endpoint only marks completion, verifying that all prerequisite data exists.
 */
export async function POST(req: Request) {
  const startTime = nodePerformance.now();
  
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return addNoCacheHeaders(response);
    }

    // Verify that user has completed all steps by checking their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_step, interests_count, subcategories_count, dealbreakers_count')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[Complete API] Error fetching profile:', profileError);
      const response = NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
      return addNoCacheHeaders(response);
    }

    // Verify prerequisites: user must have completed all steps
    if (profile.onboarding_step !== 'complete') {
      const response = NextResponse.json(
        { 
          error: 'Cannot complete onboarding: all steps must be finished first',
          current_step: profile.onboarding_step
        },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // Optional: Verify that user has saved data (sanity check)
    if (!profile.interests_count || profile.interests_count === 0) {
      const response = NextResponse.json(
        { error: 'Cannot complete onboarding: interests are required' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    if (!profile.dealbreakers_count || profile.dealbreakers_count === 0) {
      const response = NextResponse.json(
        { error: 'Cannot complete onboarding: dealbreakers are required' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const writeStart = nodePerformance.now();

    // Update profile to mark onboarding as complete
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_complete: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Complete API] Error updating profile:', updateError);
      throw updateError;
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    console.log('[Complete API] Onboarding marked as complete', {
      userId: user.id,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    const response = NextResponse.json({
      ok: true,
      success: true,
      message: 'Onboarding completed successfully'
    });
    return addNoCacheHeaders(response);

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Complete API] Unexpected error:', error);
    const response = NextResponse.json(
      {
        error: 'Failed to complete onboarding',
        message: error.message
      },
      { status: 500 }
    );
    return addNoCacheHeaders(response);
  }
}

