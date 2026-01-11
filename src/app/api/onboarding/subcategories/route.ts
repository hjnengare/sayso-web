import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching for onboarding data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/subcategories
 * Saves subcategories to user_subcategories table and updates onboarding_step
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

    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body?.subcategories) ? body.subcategories : [];

    // Valid interest IDs (to filter them out from subcategories)
    const VALID_INTEREST_IDS = [
      'food-drink',
      'beauty-wellness',
      'professional-services',
      'outdoors-adventure',
      'experiences-entertainment',
      'arts-culture',
      'family-pets',
      'shopping-lifestyle'
    ];

    // Clean and validate input - filter out null/invalid subcategory_ids
    // Expected format: array of {subcategory_id, interest_id} objects
    // IMPORTANT: Ensure subcategory_id is NOT an interest_id
    const cleaned = raw
      .filter((x: any) => {
        const hasValidStructure = x && 
          typeof x.subcategory_id === "string" && 
          x.subcategory_id.trim().length > 0 &&
          x.interest_id &&
          typeof x.interest_id === "string" &&
          x.interest_id.trim().length > 0;
        
        if (!hasValidStructure) return false;

        const subcategoryId = x.subcategory_id.trim();
        const interestId = x.interest_id.trim();

        // CRITICAL: Filter out any subcategory_id that matches an interest_id
        // This prevents interests from being counted as subcategories
        if (VALID_INTEREST_IDS.includes(subcategoryId)) {
          console.warn('[Subcategories API] Filtered out interest ID passed as subcategory:', subcategoryId);
          return false;
        }

        // Ensure interest_id is a valid interest
        if (!VALID_INTEREST_IDS.includes(interestId)) {
          console.warn('[Subcategories API] Invalid interest_id:', interestId);
          return false;
        }

        return true;
      })
      .map((x: any) => ({
        subcategory_id: x.subcategory_id.trim(),
        interest_id: x.interest_id.trim(),
      }));

    // Validate we have at least one valid subcategory
    if (cleaned.length === 0) {
      const response = NextResponse.json(
        { ok: false, error: 'No valid subcategories provided' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const writeStart = nodePerformance.now();

    // Save subcategories to user_subcategories table using RPC function
    const { error: subcategoriesError } = await supabase.rpc('replace_user_subcategories', {
      p_user_id: user.id,
      p_subcategory_data: cleaned
    });

    if (subcategoriesError) {
      console.error('[Subcategories API] Error saving subcategories:', subcategoriesError);
      // Fallback to manual insert if RPC doesn't exist
      if (subcategoriesError.message?.includes('function') || subcategoriesError.message?.includes('does not exist')) {
        console.log('[Subcategories API] RPC function not found, using fallback method');
        
        // Delete existing subcategories
        const { error: deleteError } = await supabase
          .from('user_subcategories')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('[Subcategories API] Error deleting existing subcategories:', deleteError);
          throw deleteError;
        }

        // Insert new subcategories
        if (cleaned.length > 0) {
          const rows = cleaned.map((item: { subcategory_id: string; interest_id: string }) => ({
            user_id: user.id,
            subcategory_id: item.subcategory_id,
            interest_id: item.interest_id
          }));

          const { error: insertError } = await supabase
            .from('user_subcategories')
            .insert(rows);

          if (insertError) {
            console.error('[Subcategories API] Error inserting subcategories:', insertError);
            throw insertError;
          }
        }
      } else {
        throw subcategoriesError;
      }
    }

    // Update onboarding_step to deal-breakers
    const { error: stepError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'deal-breakers',
        subcategories_count: cleaned.length,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (stepError) {
      console.error('[Subcategories API] Error updating onboarding_step:', stepError);
      throw stepError;
    }

    const writeTime = nodePerformance.now() - writeStart;

    // Fetch fresh state to return to client
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count')
      .eq('user_id', user.id)
      .maybeSingle();

    const totalTime = nodePerformance.now() - startTime;

    console.log('[Subcategories API] Subcategories saved successfully', {
      userId: user.id,
      subcategoriesCount: cleaned.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    const response = NextResponse.json({
      ok: true,
      // Return fresh onboarding state for immediate UI update (no refetch needed)
      onboarding_step: profile?.onboarding_step || 'deal-breakers',
      onboarding_complete: profile?.onboarding_complete || false,
      interests_count: profile?.interests_count || 0,
      subcategories_count: profile?.subcategories_count || cleaned.length,
      dealbreakers_count: profile?.dealbreakers_count || 0,
      performance: {
        writeTime: writeTime,
        totalTime: totalTime
      }
    });
    return addNoCacheHeaders(response);

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Subcategories API] Unexpected error:', error);
    const response = NextResponse.json(
      {
        error: 'Failed to save subcategories',
        message: error.message,
        performance: { totalTime }
      },
      { status: 500 }
    );
    return addNoCacheHeaders(response);
  }
}
