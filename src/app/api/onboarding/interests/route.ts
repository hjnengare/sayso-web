import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/interests
 * Saves interests and advances onboarding_step to 'subcategories'
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
    const { interests } = body;

    // Validate required data
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      const response = NextResponse.json(
        { error: 'Interests are required (minimum 3)' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // Validate interest count (3-6)
    if (interests.length < 3 || interests.length > 6) {
      const response = NextResponse.json(
        { error: 'Please select 3-6 interests' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // 1. Save interests using RPC function
    const { error: interestsError } = await supabase.rpc('replace_user_interests', {
      p_user_id: user.id,
      p_interest_ids: interests
    });

    if (interestsError) {
      console.error('[Interests API] Error saving interests:', interestsError);
      throw new Error('Failed to save interests');
    }

    // 2. Update onboarding_step to 'subcategories'
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'subcategories',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Interests API] Error updating profile:', updateError);
      throw updateError;
    }

    console.log('[Interests API] Interests saved successfully', {
      userId: user.id,
      interests: interests.length,
      next_step: 'subcategories'
    });

    const response = NextResponse.json({
      ok: true,
      success: true,
      message: 'Interests saved successfully',
      onboarding_step: 'subcategories',
      interests_count: interests.length
    });
    return addNoCacheHeaders(response);

  } catch (error: any) {
    console.error('[Interests API] Unexpected error:', error);
    const response = NextResponse.json(
      {
        error: 'Failed to save interests',
        message: error.message
      },
      { status: 500 }
    );
    return addNoCacheHeaders(response);
  }
}
