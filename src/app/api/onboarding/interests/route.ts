import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/interests
 * Saves interests and advances onboarding_step to 'subcategories' — requires auth
 */
export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = await req.json();
    const interests = body?.interests ?? body?.interest_ids;

    // Validate required data
    if (!interests || !Array.isArray(interests)) {
      const response = NextResponse.json(
        { error: 'Interests must be an array' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const rawInterests = interests.map((id: unknown) => (typeof id === 'string' ? id.trim() : ''));
    const invalidInterests = rawInterests.filter((id) => id.length === 0);

    if (invalidInterests.length > 0) {
      const response = NextResponse.json(
        { error: 'All interest IDs must be non-empty strings' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const normalizedInterests = Array.from(new Set(rawInterests));

    if (normalizedInterests.length < 3) {
      const response = NextResponse.json(
        { error: 'Please select at least 3 interests' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    if (normalizedInterests.length > 6) {
      const response = NextResponse.json(
        { error: 'Please select 3-6 interests' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // 1. Save interests using RPC function
    const { error: interestsError } = await supabase.rpc('replace_user_interests', {
      p_user_id: user.id,
      p_interest_ids: normalizedInterests
    });

    if (interestsError) {
      console.warn('[Interests API] RPC failed, falling back to direct writes:', interestsError);

      const { error: deleteError } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[Interests API] Error clearing interests:', deleteError);
        throw deleteError;
      }

      const rows = normalizedInterests.map((interestId: string) => ({
        user_id: user.id,
        interest_id: interestId
      }));

      const { error: insertError } = await supabase
        .from('user_interests')
        .insert(rows);

      if (insertError) {
        console.error('[Interests API] Error inserting interests:', insertError);
        throw insertError;
      }
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
      ok: true
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
});
