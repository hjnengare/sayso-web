import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/subcategories
 * Saves subcategories and advances onboarding_step to 'deal-breakers'
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
    const { subcategories } = body;

    // Validate required data
    if (!subcategories || !Array.isArray(subcategories) || subcategories.length === 0) {
      const response = NextResponse.json(
        { error: 'Subcategories are required (minimum 1)' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // Validate subcategory count (max 10)
    if (subcategories.length > 10) {
      const response = NextResponse.json(
        { error: 'Maximum 10 subcategories allowed' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // 1. Save subcategories using RPC function
    const { error: subcategoriesError } = await supabase.rpc('replace_user_subcategories', {
      p_user_id: user.id,
      p_subcategories: subcategories
    });

    if (subcategoriesError) {
      console.error('[Subcategories API] Error saving subcategories:', subcategoriesError);
      throw new Error('Failed to save subcategories');
    }

    // 2. Update onboarding_step to 'deal-breakers'
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'deal-breakers',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Subcategories API] Error updating profile:', updateError);
      throw updateError;
    }

    console.log('[Subcategories API] Subcategories saved successfully', {
      userId: user.id,
      subcategories: subcategories.length,
      next_step: 'deal-breakers'
    });

    const response = NextResponse.json({
      ok: true,
      success: true,
      message: 'Subcategories saved successfully',
      onboarding_step: 'deal-breakers',
      subcategories_count: subcategories.length
    });
    return addNoCacheHeaders(response);

  } catch (error: any) {
    console.error('[Subcategories API] Unexpected error:', error);
    const response = NextResponse.json(
      {
        error: 'Failed to save subcategories',
        message: error.message
      },
      { status: 500 }
    );
    return addNoCacheHeaders(response);
  }
}
