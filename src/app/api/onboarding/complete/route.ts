import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching for onboarding data
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

/**
 * POST /api/onboarding/complete
 * Marks onboarding as complete (data already saved in previous steps)
 *
 * Note: Interests, subcategories, and dealbreakers are saved in earlier steps
 * This endpoint only sets onboarding_completed_at
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

    const writeStart = nodePerformance.now();

    // Parallelize all validation queries for faster response
    const [interestsResult, subcategoriesResult, dealbreakersResult] = await Promise.all([
      supabase
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id)
        .limit(1),
      supabase
        .from('user_subcategories')
        .select('subcategory_id')
        .eq('user_id', user.id)
        .limit(1),
      supabase
        .from('user_dealbreakers')
        .select('dealbreaker_id')
        .eq('user_id', user.id)
        .limit(1),
    ]);

    const { data: interestsData, error: interestsError } = interestsResult;
    const { data: subcategoriesData, error: subcategoriesError } = subcategoriesResult;
    const { data: dealbreakersData, error: dealbreakersError } = dealbreakersResult;

    if (interestsError) {
      console.error('[Complete API] Error checking interests:', interestsError);
      throw interestsError;
    }

    if (!interestsData || interestsData.length === 0) {
      const response = NextResponse.json({ error: 'Complete interests first' }, { status: 400 });
      return addNoCacheHeaders(response);
    }

    if (subcategoriesError) {
      console.error('[Complete API] Error checking subcategories:', subcategoriesError);
      throw subcategoriesError;
    }

    if (!subcategoriesData || subcategoriesData.length === 0) {
      const response = NextResponse.json({ error: 'Complete subcategories first' }, { status: 400 });
      return addNoCacheHeaders(response);
    }

    if (dealbreakersError) {
      console.error('[Complete API] Error checking dealbreakers:', dealbreakersError);
      throw dealbreakersError;
    }

    if (!dealbreakersData || dealbreakersData.length === 0) {
      const response = NextResponse.json({ error: 'Complete dealbreakers first' }, { status: 400 });
      return addNoCacheHeaders(response);
    }

    // Mark onboarding as complete
    let { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'complete',
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
        account_role: 'user', // Ensure personal users have role set
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError && isSchemaCacheError(updateError)) {
      ({ error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_step: 'complete',
          onboarding_complete: true,
          account_role: 'user',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id));
    }

    if (updateError) {
      console.error('[Complete API] Error updating profile:', updateError);
      throw updateError;
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    console.log('[Complete API] Onboarding completed successfully', {
      userId: user.id,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    const response = NextResponse.json({
      ok: true,
      success: true,
      message: 'Onboarding completed successfully',
      onboarding_step: 'complete',
      onboarding_complete: true
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


