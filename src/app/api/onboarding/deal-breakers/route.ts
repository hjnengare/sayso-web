import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/deal-breakers
 * Saves deal-breakers and advances onboarding_step to 'complete'
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return addNoCacheHeaders(response);
    }

    // Parse request body
    const body = await req.json();
    const { dealbreakers } = body;

    // Validate required data
    if (!dealbreakers || !Array.isArray(dealbreakers) || dealbreakers.length === 0) {
      const response = NextResponse.json(
        { error: 'Deal-breakers are required (minimum 1)' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // Validate dealbreaker count (max 3)
    if (dealbreakers.length > 3) {
      const response = NextResponse.json(
        { error: 'Maximum 3 deal-breakers allowed' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // 1. Save dealbreakers using RPC function
    const { error: dealbreakersError } = await supabase.rpc('replace_user_dealbreakers', {
      p_user_id: user.id,
      p_dealbreaker_ids: dealbreakers
    });

    if (dealbreakersError) {
      console.error('[Deal-breakers API] Error saving dealbreakers:', dealbreakersError);
      throw new Error('Failed to save dealbreakers');
    }

    // 2. Update onboarding_step to 'complete' (but do NOT set onboarding_complete)
    // The atomic completion API (/api/onboarding/complete-atomic) handles final completion
    // This prevents partial saves that leave users in inconsistent states
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'complete',
        // NOTE: onboarding_complete is set ONLY by the atomic completion API
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Deal-breakers API] Error updating profile:', updateError);
      throw updateError;
    }

    console.log('[Deal-breakers API] Deal-breakers saved successfully', {
      userId: user.id,
      dealbreakers: dealbreakers.length,
      next_step: 'complete'
    });

    const response = NextResponse.json({
      ok: true,
      success: true,
      message: 'Deal-breakers saved successfully',
      onboarding_step: 'complete',
      dealbreakers_count: dealbreakers.length
    });
    return addNoCacheHeaders(response);

  } catch (error: any) {
    console.error('[Deal-breakers API] Unexpected error:', error);
    const response = NextResponse.json(
      {
        error: 'Failed to save dealbreakers',
        message: error.message
      },
      { status: 500 }
    );
    return addNoCacheHeaders(response);
  }
}
