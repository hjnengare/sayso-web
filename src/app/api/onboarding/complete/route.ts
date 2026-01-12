import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching for onboarding data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/complete
 * Marks onboarding as complete (data already saved in previous steps)
 *
 * Note: Interests, subcategories, and dealbreakers are saved in earlier steps
 * This endpoint only sets onboarding_complete=true
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

    // Mark onboarding as complete
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

