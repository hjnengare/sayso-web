import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching for onboarding data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/complete
 * Saves ALL onboarding data and marks onboarding as complete
 *
 * This endpoint receives interests, subcategories, and dealbreakers from localStorage
 * and saves them all to the database in a single transaction
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

    // Parse request body
    const body = await req.json();
    const { interests, subcategories, dealbreakers } = body;

    // Validate required data
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      const response = NextResponse.json(
        { error: 'Interests are required' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    if (!subcategories || !Array.isArray(subcategories) || subcategories.length === 0) {
      const response = NextResponse.json(
        { error: 'Subcategories are required' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    if (!dealbreakers || !Array.isArray(dealbreakers) || dealbreakers.length === 0) {
      const response = NextResponse.json(
        { error: 'Dealbreakers are required' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const writeStart = nodePerformance.now();

    // 1. Save interests using RPC function
    const { error: interestsError } = await supabase.rpc('replace_user_interests', {
      p_user_id: user.id,
      p_interest_ids: interests
    });

    if (interestsError) {
      console.error('[Complete API] Error saving interests:', interestsError);
      throw new Error('Failed to save interests');
    }

    // 2. Save subcategories using RPC function
    const { error: subcategoriesError } = await supabase.rpc('replace_user_subcategories', {
      p_user_id: user.id,
      p_subcategories: subcategories
    });

    if (subcategoriesError) {
      console.error('[Complete API] Error saving subcategories:', subcategoriesError);
      throw new Error('Failed to save subcategories');
    }

    // 3. Save dealbreakers using RPC function
    const { error: dealbreakersError } = await supabase.rpc('replace_user_dealbreakers', {
      p_user_id: user.id,
      p_dealbreaker_ids: dealbreakers
    });

    if (dealbreakersError) {
      console.error('[Complete API] Error saving dealbreakers:', dealbreakersError);
      throw new Error('Failed to save dealbreakers');
    }

    // 4. Mark onboarding as complete
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'complete',
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

    console.log('[Complete API] Onboarding completed successfully', {
      userId: user.id,
      interests: interests.length,
      subcategories: subcategories.length,
      dealbreakers: dealbreakers.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    const response = NextResponse.json({
      ok: true,
      success: true,
      message: 'Onboarding completed successfully',
      onboarding_step: 'complete',
      onboarding_complete: true,
      interests_count: interests.length,
      subcategories_count: subcategories.length,
      dealbreakers_count: dealbreakers.length
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

