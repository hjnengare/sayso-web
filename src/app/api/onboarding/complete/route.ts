import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { performance as nodePerformance } from 'perf_hooks';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

/**
 * POST /api/onboarding/complete
 * Marks onboarding as complete — requires auth
 */
export const POST = withUser(async (_req: NextRequest, { user, supabase }) => {
  const startTime = nodePerformance.now();
  try {
    const writeStart = nodePerformance.now();

    const [interestsResult, subcategoriesResult, dealbreakersResult] = await Promise.all([
      supabase.from('user_interests').select('interest_id').eq('user_id', user.id).limit(1),
      supabase.from('user_subcategories').select('subcategory_id').eq('user_id', user.id).limit(1),
      supabase.from('user_dealbreakers').select('dealbreaker_id').eq('user_id', user.id).limit(1),
    ]);

    if (interestsResult.error) { console.error('[Complete API] Error checking interests:', interestsResult.error); throw interestsResult.error; }
    if (!interestsResult.data || interestsResult.data.length === 0) return addNoCacheHeaders(NextResponse.json({ error: 'Complete interests first' }, { status: 400 }));
    if (subcategoriesResult.error) { console.error('[Complete API] Error checking subcategories:', subcategoriesResult.error); throw subcategoriesResult.error; }
    if (!subcategoriesResult.data || subcategoriesResult.data.length === 0) return addNoCacheHeaders(NextResponse.json({ error: 'Complete subcategories first' }, { status: 400 }));
    if (dealbreakersResult.error) { console.error('[Complete API] Error checking dealbreakers:', dealbreakersResult.error); throw dealbreakersResult.error; }
    if (!dealbreakersResult.data || dealbreakersResult.data.length === 0) return addNoCacheHeaders(NextResponse.json({ error: 'Complete dealbreakers first' }, { status: 400 }));

    let { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'complete',
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
        account_role: 'user',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError && isSchemaCacheError(updateError)) {
      ({ error: updateError } = await supabase
        .from('profiles')
        .update({ onboarding_step: 'complete', onboarding_complete: true, account_role: 'user', updated_at: new Date().toISOString() })
        .eq('user_id', user.id));
    }

    if (updateError) { console.error('[Complete API] Error updating profile:', updateError); throw updateError; }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;
    console.log('[Complete API] Onboarding completed successfully', { userId: user.id, writeTime: `${writeTime.toFixed(2)}ms`, totalTime: `${totalTime.toFixed(2)}ms` });

    return addNoCacheHeaders(NextResponse.json({
      ok: true, success: true, message: 'Onboarding completed successfully',
      onboarding_step: 'complete', onboarding_complete: true
    }));
  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Complete API] Unexpected error:', error);
    return addNoCacheHeaders(NextResponse.json({ error: 'Failed to complete onboarding', message: error.message }, { status: 500 }));
  }
});
