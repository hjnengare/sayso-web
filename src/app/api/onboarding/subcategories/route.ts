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
    console.error('[Subcategories API] Profile update error:', {
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
 * POST /api/onboarding/subcategories
 * Lightweight endpoint to save subcategories and mark step as done
 */
export async function POST(req: Request) {
  const startTime = nodePerformance.now();
  
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subcategories } = await req.json();

    if (!subcategories || !Array.isArray(subcategories) || subcategories.length === 0) {
      return NextResponse.json(
        { error: 'Subcategories array is required' },
        { status: 400 }
      );
    }

    const writeStart = nodePerformance.now();

    // Map subcategories to expected format
    const subcategoryData = subcategories.map((sub: any) => ({
      subcategory_id: sub.subcategory_id || sub.id,
      interest_id: sub.interest_id
    }));

    // Single atomic operation: save subcategories and update profile
    const { error: subcategoriesError } = await supabase.rpc('replace_user_subcategories', {
      p_user_id: user.id,
      p_subcategory_data: subcategoryData
    });

    if (subcategoriesError) {
      console.error('[Subcategories API] Error saving subcategories:', subcategoriesError);
      return NextResponse.json(
        { error: 'Failed to save subcategories', details: subcategoriesError.message },
        { status: 500 }
      );
    }

    // Update profile to mark subcategories step as done and update subcategories_count (with verification)
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_step: 'deal-breakers',
          subcategories_count: subcategories.length,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select('onboarding_step, subcategories_count')
        .single();

      if (profileError) {
        throw profileError;
      }

      // Verify the update actually worked
      if (!profileData || profileData.onboarding_step !== 'deal-breakers') {
        throw new Error(`Profile onboarding_step did not update correctly. Expected: deal-breakers, Got: ${profileData?.onboarding_step}`);
      }
    } catch (profileError: any) {
      console.error('[Subcategories API] Error updating profile:', profileError);
      // Subcategories are saved, but profile update failed - throw to ensure user knows
      throw new Error(`Failed to update profile step: ${profileError.message}`);
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    console.log('[Subcategories API] Save completed', {
      userId: user.id,
      subcategoriesCount: subcategories.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    return NextResponse.json({
      ok: true,
      subcategoriesCount: subcategories.length,
      performance: {
        writeTime: writeTime,
        totalTime: totalTime
      }
    });

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Subcategories API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save subcategories',
        message: error.message,
        performance: { totalTime }
      },
      { status: 500 }
    );
  }
}

