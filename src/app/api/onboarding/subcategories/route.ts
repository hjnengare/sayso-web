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
    console.log('[Subcategories API] POST request received');
    const supabase = await getServerSupabase(req);
    console.log('[Subcategories API] Getting user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[Subcategories API] Auth error:', authError);
      const response = NextResponse.json({
        error: 'Authentication failed',
        message: authError.message
      }, { status: 401 });
      return addNoCacheHeaders(response);
    }

    if (!user) {
      console.error('[Subcategories API] No user found');
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return addNoCacheHeaders(response);
    }

    console.log('[Subcategories API] User authenticated:', user.id);

    // Parse request body
    const body = await req.json();
    const { subcategories } = body;

    console.log('[Subcategories API] Received subcategories:', {
      count: subcategories?.length,
      data: subcategories
    });

    // Validate required data
    if (!subcategories || !Array.isArray(subcategories) || subcategories.length === 0) {
      console.error('[Subcategories API] Validation failed: empty or invalid subcategories');
      const response = NextResponse.json(
        { error: 'Subcategories are required (minimum 1)' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // Validate subcategory count (max 10)
    if (subcategories.length > 10) {
      console.error('[Subcategories API] Validation failed: too many subcategories');
      const response = NextResponse.json(
        { error: 'Maximum 10 subcategories allowed' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // 1. Transform subcategories array to include interest_id
    // We need to map subcategory IDs to their parent interest IDs
    const subcategoryMapping: Record<string, string> = {
      // Food & Drink
      'restaurants': 'food-drink',
      'cafes': 'food-drink',
      'bars': 'food-drink',
      'fast-food': 'food-drink',
      'fine-dining': 'food-drink',
      // Beauty & Wellness
      'gyms': 'beauty-wellness',
      'spas': 'beauty-wellness',
      'salons': 'beauty-wellness',
      'wellness': 'beauty-wellness',
      'nail-salons': 'beauty-wellness',
      // Professional Services
      'education-learning': 'professional-services',
      'transport-travel': 'professional-services',
      'finance-insurance': 'professional-services',
      'plumbers': 'professional-services',
      'electricians': 'professional-services',
      'legal-services': 'professional-services',
      // Outdoors & Adventure
      'hiking': 'outdoors-adventure',
      'cycling': 'outdoors-adventure',
      'water-sports': 'outdoors-adventure',
      'camping': 'outdoors-adventure',
      // Entertainment & Experiences
      'events-festivals': 'experiences-entertainment',
      'sports-recreation': 'experiences-entertainment',
      'nightlife': 'experiences-entertainment',
      'comedy-clubs': 'experiences-entertainment',
      'cinemas': 'experiences-entertainment',
      // Arts & Culture
      'museums': 'arts-culture',
      'galleries': 'arts-culture',
      'theaters': 'arts-culture',
      'concerts': 'arts-culture',
      // Family & Pets
      'family-activities': 'family-pets',
      'pet-services': 'family-pets',
      'childcare': 'family-pets',
      'veterinarians': 'family-pets',
      // Shopping & Lifestyle
      'fashion': 'shopping-lifestyle',
      'electronics': 'shopping-lifestyle',
      'home-decor': 'shopping-lifestyle',
      'books': 'shopping-lifestyle',
    };

    const subcategoryData = subcategories.map((subcategoryId: string) => ({
      subcategory_id: subcategoryId,
      interest_id: subcategoryMapping[subcategoryId] || 'unknown'
    }));

    console.log('[Subcategories API] Transformed subcategory data:', subcategoryData);

    // 2. Save subcategories using RPC function
    console.log('[Subcategories API] Calling replace_user_subcategories RPC...');
    const { data: rpcData, error: subcategoriesError } = await supabase.rpc('replace_user_subcategories', {
      p_user_id: user.id,
      p_subcategory_data: subcategoryData
    });

    if (subcategoriesError) {
      console.error('[Subcategories API] RPC error:', {
        message: subcategoriesError.message,
        details: subcategoriesError.details,
        hint: subcategoriesError.hint,
        code: subcategoriesError.code
      });
      throw new Error(`Failed to save subcategories: ${subcategoriesError.message}`);
    }

    console.log('[Subcategories API] RPC call successful:', rpcData);

    // 3. Update onboarding_step to 'deal-breakers'
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
