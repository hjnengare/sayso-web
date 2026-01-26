import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/complete-atomic
 *
 * ATOMIC onboarding completion for personal users.
 * Saves interests, subcategories, dealbreakers AND sets onboarding_complete=true
 * in a SINGLE database transaction.
 *
 * If ANY step fails, the entire operation is rolled back.
 * This prevents partial saves that leave users in inconsistent states.
 *
 * Request body:
 * {
 *   interests: string[],      // 3-6 interest IDs (required)
 *   subcategories: string[],  // 1-10 subcategory IDs (required)
 *   dealbreakers: string[]    // 1-3 dealbreaker IDs (required)
 * }
 *
 * Response:
 * {
 *   ok: boolean,
 *   success: boolean,
 *   onboarding_complete: boolean,
 *   interests_count: number,
 *   subcategories_count: number,
 *   dealbreakers_count: number
 * }
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return addNoCacheHeaders(response);
    }

    // Parse and validate request body
    const body = await req.json();
    const { interests, subcategories, dealbreakers } = body;

    // Validate interests (3-6 required)
    if (!interests || !Array.isArray(interests)) {
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Interests must be an array' }, { status: 400 })
      );
    }
    if (interests.length < 3 || interests.length > 6) {
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Please select 3-6 interests' }, { status: 400 })
      );
    }

    // Validate subcategories (1-10 required)
    if (!subcategories || !Array.isArray(subcategories)) {
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Subcategories must be an array' }, { status: 400 })
      );
    }
    if (subcategories.length < 1 || subcategories.length > 10) {
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Please select 1-10 subcategories' }, { status: 400 })
      );
    }

    // Validate dealbreakers (1-3 required)
    if (!dealbreakers || !Array.isArray(dealbreakers)) {
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Dealbreakers must be an array' }, { status: 400 })
      );
    }
    if (dealbreakers.length < 1 || dealbreakers.length > 3) {
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Please select 1-3 dealbreakers' }, { status: 400 })
      );
    }

    // Call the atomic RPC function
    const { data, error } = await supabase.rpc('complete_onboarding', {
      p_user_id: user.id,
      p_interest_ids: interests,
      p_subcategory_ids: subcategories,
      p_dealbreaker_ids: dealbreakers
    });

    if (error) {
      console.error('[Complete-Atomic API] RPC error:', error);
      return addNoCacheHeaders(
        NextResponse.json(
          { error: 'Failed to complete onboarding', message: error.message },
          { status: 500 }
        )
      );
    }

    console.log('[Complete-Atomic API] Onboarding completed atomically', {
      userId: user.id,
      result: data
    });

    const response = NextResponse.json({
      ok: true,
      success: true,
      message: 'Onboarding completed successfully',
      onboarding_complete: true,
      interests_count: data?.interests_count || interests.length,
      subcategories_count: data?.subcategories_count || subcategories.length,
      dealbreakers_count: data?.dealbreakers_count || dealbreakers.length
    });
    return addNoCacheHeaders(response);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Complete-Atomic API] Unexpected error:', error);
    return addNoCacheHeaders(
      NextResponse.json(
        { error: 'Failed to complete onboarding', message },
        { status: 500 }
      )
    );
  }
}
