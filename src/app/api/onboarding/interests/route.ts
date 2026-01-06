import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';

/**
 * Helper function to update profile onboarding step with verification
 */
async function updateProfileStep(
  supabase: any,
  userId: string,
  step: string
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      onboarding_step: step,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select('onboarding_step')
    .single();

  if (error) {
    console.error('[Interests API] Profile update error:', {
      error: error.message,
      code: error.code,
      details: error.details,
    });
    throw error;
  }

  // Verify the update actually worked
  if (!data || data.onboarding_step !== step) {
    throw new Error(`Profile onboarding_step did not update correctly. Expected: ${step}, Got: ${data?.onboarding_step}`);
  }

  return data;
}

/**
 * POST /api/onboarding/interests
 * Lightweight endpoint to save interests and mark step as done
 * Returns immediately after minimal write operations
 */
export async function POST(req: Request) {
  const startTime = nodePerformance.now();
  
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { interests } = await req.json();

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return NextResponse.json(
        { error: 'Interests array is required' },
        { status: 400 }
      );
    }

    const writeStart = nodePerformance.now();

    // Single atomic operation: save interests and update profile
    const { error: interestsError } = await supabase.rpc('replace_user_interests', {
      p_user_id: user.id,
      p_interest_ids: interests
    });

    if (interestsError) {
      console.error('[Interests API] Error saving interests:', interestsError);
      return NextResponse.json(
        { error: 'Failed to save interests', details: interestsError.message },
        { status: 500 }
      );
    }

    // Update profile to mark interests step as done and update interests_count (with verification)
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_step: 'subcategories',
          interests_count: interests.length,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select('onboarding_step, interests_count')
        .single();

      if (profileError) {
        throw profileError;
      }

      // Verify the update actually worked
      if (!profileData || profileData.onboarding_step !== 'subcategories') {
        throw new Error(`Profile onboarding_step did not update correctly. Expected: subcategories, Got: ${profileData?.onboarding_step}`);
      }
    } catch (profileError: any) {
      console.error('[Interests API] Error updating profile:', profileError);
      // Interests are saved, but profile update failed - throw to ensure user knows
      throw new Error(`Failed to update profile step: ${profileError.message}`);
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    console.log('[Interests API] Save completed', {
      userId: user.id,
      interestsCount: interests.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    return NextResponse.json({
      ok: true,
      interestsCount: interests.length,
      performance: {
        writeTime: writeTime,
        totalTime: totalTime
      }
    });

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Interests API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save interests',
        message: error.message,
        performance: { totalTime }
      },
      { status: 500 }
    );
  }
}

