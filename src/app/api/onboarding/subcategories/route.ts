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

    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body?.subcategories) ? body.subcategories : [];

    // Log incoming payload for debugging
    console.log('[Subcategories API] Incoming payload:', {
      rawLength: raw.length,
      raw: raw
    });

    // Clean and validate input - filter out null/invalid subcategory_ids
    const cleaned = raw
      .filter((x: any) => {
        const isValid = x && 
          typeof x.subcategory_id === "string" && 
          x.subcategory_id.trim().length > 0;
        return isValid;
      })
      .map((x: any) => ({
        subcategory_id: x.subcategory_id.trim(),
        interest_id: String(x.interest_id || "").trim(),
      }));

    // Log rejected items for debugging
    const rejected = raw.filter((x: any) => {
      return !x || 
        typeof x.subcategory_id !== "string" || 
        x.subcategory_id.trim().length === 0;
    });
    if (rejected.length > 0) {
      console.warn('[Subcategories API] Rejected invalid items:', rejected);
    }

    // Validate we have at least one valid subcategory
    if (cleaned.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No valid subcategories provided' },
        { status: 400 }
      );
    }

    // Guard against missing interest_id
    const missingInterest = cleaned.find((x) => !x.interest_id || x.interest_id.trim().length === 0);
    if (missingInterest) {
      console.error('[Subcategories API] Missing interest_id:', missingInterest);
      return NextResponse.json(
        { ok: false, error: 'One or more subcategories missing interest_id' },
        { status: 400 }
      );
    }

    console.log('[Subcategories API] Cleaned subcategories:', {
      count: cleaned.length,
      items: cleaned
    });

    const writeStart = nodePerformance.now();

    // Use cleaned data for insert
    const subcategoryData = cleaned;

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
    // CRITICAL: Check if onboarding should be marked complete
    // Completion criteria: interests_count > 0 && subcategories_count > 0 && dealbreakers_count > 0
    // ALL THREE STEPS ARE REQUIRED
    try {
      // First, get current profile to check interests_count and dealbreakers_count
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('interests_count, subcategories_count, dealbreakers_count')
        .eq('user_id', user.id)
        .single();

      const interestsCount = currentProfile?.interests_count || 0;
      const newSubcategoriesCount = subcategories.length;
      const dealbreakersCount = currentProfile?.dealbreakers_count || 0;

      // CRITICAL: After saving subcategories, ALWAYS advance to deal-breakers step
      // Deal-breakers are REQUIRED, so we never mark complete here
      // The step MUST advance to 'deal-breakers' to allow user to continue
      const nextStep = 'deal-breakers';

      console.log('[Subcategories API] Advancing onboarding step:', {
        interestsCount,
        subcategoriesCount: newSubcategoriesCount,
        dealbreakersCount,
        currentStep: 'subcategories',
        nextStep: nextStep,
        reason: 'Subcategories saved - advancing to deal-breakers (required step)'
      });

      // Update profile to advance to deal-breakers step
      // This is CRITICAL - without this update, user will be stuck in a loop
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_step: nextStep,
          onboarding_complete: false, // Never mark complete here - deal-breakers are required
          subcategories_count: newSubcategoriesCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select('onboarding_step, onboarding_complete, subcategories_count')
        .single();

      if (profileError) {
        throw profileError;
      }

      // Verify the update actually worked - CRITICAL for preventing loops
      if (!profileData || profileData.onboarding_step !== nextStep) {
        console.error('[Subcategories API] PROFILE UPDATE FAILED:', {
          expected: nextStep,
          actual: profileData?.onboarding_step,
          profileData
        });
        throw new Error(`Profile onboarding_step did not update correctly. Expected: ${nextStep}, Got: ${profileData?.onboarding_step}. This will cause an infinite loop.`);
      }

      // Verify subcategories_count was updated
      if (profileData.subcategories_count !== newSubcategoriesCount) {
        console.error('[Subcategories API] SUBCATEGORIES COUNT UPDATE FAILED:', {
          expected: newSubcategoriesCount,
          actual: profileData.subcategories_count
        });
        throw new Error(`Profile subcategories_count did not update correctly. Expected: ${newSubcategoriesCount}, Got: ${profileData.subcategories_count}`);
      }

      console.log('[Subcategories API] Profile updated:', {
        onboarding_step: profileData.onboarding_step,
        onboarding_complete: profileData.onboarding_complete,
        subcategories_count: profileData.subcategories_count
      });
    } catch (profileError: any) {
      console.error('[Subcategories API] Error updating profile:', profileError);
      // Subcategories are saved, but profile update failed - throw to ensure user knows
      throw new Error(`Failed to update profile step: ${profileError.message}`);
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    console.log('[Subcategories API] Save completed', {
      userId: user.id,
      subcategoriesCount: subcategoryData.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    return NextResponse.json({
      ok: true,
      subcategoriesCount: subcategoryData.length,
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

