import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase/server";

// Force dynamic rendering and disable caching for onboarding data
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
export async function POST(req: Request) {
  const supabase = await getServerSupabase(req);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      const SUBCATEGORY_MAPPING: Record<string, string> = {
        // Food & Drink
        "restaurants": "food-drink",
        "cafes": "food-drink",
        "bars": "food-drink",
        "fast-food": "food-drink",
        "fine-dining": "food-drink",
        // Beauty & Wellness
        "gyms": "beauty-wellness",
        "spas": "beauty-wellness",
        "salons": "beauty-wellness",
        "wellness": "beauty-wellness",
        "nail-salons": "beauty-wellness",
        // Professional Services
        "education-learning": "professional-services",
        "transport-travel": "professional-services",
        "finance-insurance": "professional-services",
        "plumbers": "professional-services",
        "electricians": "professional-services",
        "legal-services": "professional-services",
        // Outdoors & Adventure
        "hiking": "outdoors-adventure",
        "cycling": "outdoors-adventure",
        "water-sports": "outdoors-adventure",
        "camping": "outdoors-adventure",
        // Entertainment & Experiences
        "events-festivals": "experiences-entertainment",
        "sports-recreation": "experiences-entertainment",
        "nightlife": "experiences-entertainment",
        "comedy-clubs": "experiences-entertainment",
        "cinemas": "experiences-entertainment",
        // Arts & Culture
        "museums": "arts-culture",
        "galleries": "arts-culture",
        "theaters": "arts-culture",
        "concerts": "arts-culture",
        // Family & Pets
        "family-activities": "family-pets",
        "pet-services": "family-pets",
        "childcare": "family-pets",
        "veterinarians": "family-pets",
        // Shopping & Lifestyle
        "fashion": "shopping-lifestyle",
        "electronics": "shopping-lifestyle",
        "home-decor": "shopping-lifestyle",
        "books": "shopping-lifestyle"
      };
      
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

      // Try atomic function first, fallback to individual steps if function doesn't exist
      let useAtomic = true;
      const { error: completeError } = await supabase.rpc('complete_onboarding_atomic', {
        p_user_id: user.id,
        p_interest_ids: interests,
        p_subcategory_data: subcategoryData,
        p_dealbreaker_ids: dealbreakers
      });

      console.log('[Onboarding API] complete_onboarding_atomic result:', {
        error: completeError?.message,
        code: completeError?.code,
      });

      if (completeError) {
        console.error('[Onboarding API] Atomic function failed, falling back to individual steps:', completeError);
        useAtomic = false;
        
        // Fallback to individual step saving
        // Save interests
        if (interests && Array.isArray(interests)) {
          console.log('[Onboarding API] Fallback: Saving interests via replace_user_interests:', {
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
          } else {
            console.log('[Onboarding API] Successfully saved interests');
          }
        }

        // Save subcategories
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

        // Save dealbreakers
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

        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            onboarding_step: 'complete',
            onboarding_complete: true,
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
}

// GET endpoint to retrieve user's onboarding data
export async function GET(req: Request) {
  const supabase = await getServerSupabase(req);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's profile to check counts (CRITICAL: Only hydrate if user has actually saved data)
    const { data: profile } = await supabase
      .from('profiles')
      .select('interests_count, subcategories_count, dealbreakers_count')
      .eq('user_id', user.id)
      .single();

    // Get user's interests - ONLY if interests_count > 0
    let interests: string[] = [];
    if (profile && profile.interests_count && profile.interests_count > 0) {
      const { data: interestsData } = await supabase
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id);
      interests = interestsData?.map(i => i.interest_id) || [];
    }

    // Get user's subcategories - ONLY if subcategories_count > 0
    let subcategories: any[] = [];
    if (profile && profile.subcategories_count && profile.subcategories_count > 0) {
      const { data: subcategoriesData } = await supabase
        .from('user_subcategories')
        .select('subcategory_id, interest_id')
        .eq('user_id', user.id);
      subcategories = subcategoriesData || [];
    }

    // Get user's dealbreakers - ONLY if dealbreakers_count > 0
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
    
    // Disable all caching for fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding data" },
      { status: 500 }
    );
  }
}
