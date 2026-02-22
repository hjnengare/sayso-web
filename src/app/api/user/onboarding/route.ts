import { NextRequest, NextResponse } from "next/server";
import { withUser } from '@/app/api/_lib/withAuth';
import { SUBCATEGORY_TO_INTEREST } from "../../../lib/onboarding/subcategoryMapping";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * @deprecated Use per-step endpoints instead:
 * - POST /api/onboarding/interests
 * - POST /api/onboarding/subcategories
 * - POST /api/onboarding/deal-breakers
 * - POST /api/onboarding/complete
 *
 * This endpoint is kept for backward compatibility but should not be used for new code.
 */
export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const { step, interests, subcategories, dealbreakers } = await req.json();

    // ONLY allow step='complete' - URL param flow doesn't save intermediate steps
    if (step !== 'complete') {
      return NextResponse.json(
        { error: 'Only step="complete" is supported. Use URL params to pass data between steps.' },
        { status: 400 }
      );
    }

    if (step === 'complete') {
      // Complete entire onboarding atomically
      if (!interests || !Array.isArray(interests) || 
          !subcategories || !Array.isArray(subcategories) || 
          !dealbreakers || !Array.isArray(dealbreakers)) {
        console.error('[Onboarding API] Missing required arrays:', {
          hasInterests: !!interests && Array.isArray(interests),
          hasSubcategories: !!subcategories && Array.isArray(subcategories),
          hasDealbreakers: !!dealbreakers && Array.isArray(dealbreakers),
          interestsType: typeof interests,
          subcategoriesType: typeof subcategories,
          dealbreakersType: typeof dealbreakers
        });
        return NextResponse.json(
          { error: 'All data arrays are required for completion' },
          { status: 400 }
        );
      }

      console.log('[Onboarding API] Received data:', {
        interestsCount: interests.length,
        subcategoriesCount: subcategories.length,
        dealbreakersCount: dealbreakers.length,
        subcategoriesSample: subcategories.slice(0, 3),
        subcategoriesType: typeof subcategories[0]
      });

      // Handle subcategories: can be string array (from URL params) or object array (legacy)
      // Use static mapping instead of database query (subcategories table doesn't exist)
      let subcategoryData: Array<{ subcategory_id: string; interest_id: string }> = [];
      
      // Static subcategory mapping (matches subcategories page and API)
      const SUBCATEGORY_MAPPING = SUBCATEGORY_TO_INTEREST;
      
      // Allow empty subcategories array (user might not have selected any)
      if (subcategories.length > 0) {
        // Check if subcategories are strings or objects
        const isStringArray = typeof subcategories[0] === 'string';
        
        if (isStringArray) {
          // Clean and validate subcategory IDs
          const validSubcategoryIds = (subcategories as string[])
            .filter(id => id && typeof id === 'string' && id.trim().length > 0)
            .map(id => id.trim());

          if (validSubcategoryIds.length === 0) {
            console.warn('[Onboarding API] No valid subcategory IDs provided');
            // Allow empty subcategories - user might not have selected any
            subcategoryData = [];
          } else {
            // Map subcategory IDs to interest_ids using static mapping
            const mappedSubcategories: Array<{ subcategory_id: string; interest_id: string }> = [];
            const missingIds: string[] = [];
            
            for (const subcategoryId of validSubcategoryIds) {
              const interestId = SUBCATEGORY_MAPPING[subcategoryId];
              if (interestId) {
                mappedSubcategories.push({
                  subcategory_id: subcategoryId,
                  interest_id: interestId
                });
              } else {
                missingIds.push(subcategoryId);
              }
            }
            
            // Validate that we found all subcategories
            if (missingIds.length > 0) {
              console.error('[Onboarding API] Some subcategories not found in mapping:', {
                missing: missingIds,
                found: mappedSubcategories.map(s => s.subcategory_id),
                requested: validSubcategoryIds
              });
              return NextResponse.json(
                { error: `Invalid subcategory IDs: ${missingIds.join(', ')}` },
                { status: 400 }
              );
            }
            
            subcategoryData = mappedSubcategories;
            console.log('[Onboarding API] Mapped subcategories:', {
              count: subcategoryData.length,
              sample: subcategoryData.slice(0, 3)
            });
          }
        } else {
          // Legacy object format
          subcategoryData = (subcategories as any[])
            .filter(sub => sub && (sub.subcategory_id || sub.id) && sub.interest_id)
            .map(sub => ({
              subcategory_id: sub.subcategory_id || sub.id,
              interest_id: sub.interest_id
            }));
        }
      }

      console.log('[Onboarding API] Saving onboarding data:', {
        userId: user.id,
        interestIds: interests,
        interestIdsType: Array.isArray(interests) ? 'array' : typeof interests,
        interestIdsLength: Array.isArray(interests) ? interests.length : 'N/A',
        subcategoryData: subcategoryData,
        dealbreakerIds: dealbreakers,
      });

      // Save data using per-step functions
      if (interests && Array.isArray(interests)) {
        console.log('[Onboarding API] Saving interests via replace_user_interests:', {
          userId: user.id,
          interestIds: interests,
        });
        const { error: interestsError } = await supabase.rpc('replace_user_interests', {
          p_user_id: user.id,
          p_interest_ids: interests
        });
        if (interestsError) {
          console.error('[Onboarding API] Error saving interests:', interestsError);
          return NextResponse.json(
            { error: `Failed to save interests: ${interestsError.message || 'Unknown error'}` },
            { status: 500 }
          );
        }
      }

      if (subcategoryData && Array.isArray(subcategoryData)) {
        const { error: subcategoriesError } = await supabase.rpc('replace_user_subcategories', {
          p_user_id: user.id,
          p_subcategory_data: subcategoryData
        });
        if (subcategoriesError) {
          console.error('[Onboarding API] Error saving subcategories:', subcategoriesError);
          return NextResponse.json(
            { error: `Failed to save subcategories: ${subcategoriesError.message || 'Unknown error'}` },
            { status: 500 }
          );
        }
      }

      if (dealbreakers && Array.isArray(dealbreakers)) {
        const { error: dealbreakersError } = await supabase.rpc('replace_user_dealbreakers', {
          p_user_id: user.id,
          p_dealbreaker_ids: dealbreakers
        });
        if (dealbreakersError) {
          console.error('[Onboarding API] Error saving dealbreakers:', dealbreakersError);
          return NextResponse.json(
            { error: `Failed to save dealbreakers: ${dealbreakersError.message || 'Unknown error'}` },
            { status: 500 }
          );
        }
      }

      // NOTE: onboarding_completed_at is intentionally NOT set here.
      // It is set exclusively by /api/onboarding/complete when the user
      // reaches the /complete page — that is the single source of truth.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_step: 'complete',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('[Onboarding API] Error updating profile:', profileError);
        return NextResponse.json(
          { error: `Failed to update profile: ${profileError.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    const response = NextResponse.json({ 
      success: true,
      message: 'Onboarding progress saved successfully'
    });
    
    // Disable all caching for fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error) {
    console.error('[Onboarding API] Unexpected error saving onboarding data:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to save onboarding progress: ${errorMessage}` },
      { status: 500 }
    );
  }
});

// GET endpoint to retrieve user's onboarding data
export const GET = withUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('interests_count, subcategories_count, dealbreakers_count')
      .eq('user_id', user.id)
      .single();

    let interests: string[] = [];
    if (profile && profile.interests_count && profile.interests_count > 0) {
      const { data: interestsData } = await supabase
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id);
      interests = interestsData?.map(i => i.interest_id) || [];
    }

    let subcategories: any[] = [];
    if (profile && profile.subcategories_count && profile.subcategories_count > 0) {
      const { data: subcategoriesData } = await supabase
        .from('user_subcategories')
        .select('subcategory_id, interest_id')
        .eq('user_id', user.id);
      subcategories = subcategoriesData || [];
    }

    let dealbreakers: string[] = [];
    if (profile && profile.dealbreakers_count && profile.dealbreakers_count > 0) {
      const { data: dealbreakersData } = await supabase
        .from('user_dealbreakers')
        .select('dealbreaker_id')
        .eq('user_id', user.id);
      dealbreakers = dealbreakersData?.map(d => d.dealbreaker_id) || [];
    }

    const response = NextResponse.json({
      interests,
      subcategories,
      dealbreakers,
      interests_count: profile?.interests_count || 0,
      subcategories_count: profile?.subcategories_count || 0,
      dealbreakers_count: profile?.dealbreakers_count || 0
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json({ error: "Failed to fetch onboarding data" }, { status: 500 });
  }
});
