import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
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
        return NextResponse.json(
          { error: 'All data arrays are required for completion' },
          { status: 400 }
        );
      }

      // Handle subcategories: can be string array (from URL params) or object array (legacy)
      // If strings, we need to fetch interest_id from DB
      let subcategoryData: Array<{ subcategory_id: string; interest_id: string }> = [];
      
      if (subcategories.length > 0) {
        // Check if subcategories are strings or objects
        const isStringArray = typeof subcategories[0] === 'string';
        
        if (isStringArray) {
          // Fetch interest_id for each subcategory from DB
          const { data: subcategoriesFromDB, error: subcatFetchError } = await supabase
            .from('subcategories')
            .select('id, interest_id')
            .in('id', subcategories as string[]);

          if (subcatFetchError) {
            console.error('[Onboarding API] Error fetching subcategory data:', subcatFetchError);
            return NextResponse.json(
              { error: 'Failed to validate subcategories' },
              { status: 400 }
            );
          }

          if (subcategoriesFromDB) {
            subcategoryData = subcategoriesFromDB.map((sub: { id: string; interest_id: string }) => ({
              subcategory_id: sub.id,
              interest_id: sub.interest_id
            }));
          }
        } else {
          // Legacy object format
          subcategoryData = (subcategories as any[]).map(sub => ({
            subcategory_id: sub.subcategory_id || sub.id,
            interest_id: sub.interest_id
          }));
        }
      }

      // Clean and validate inputs
      const validInterests = Array.from(new Set(
        interests
          .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
          .map((id: string) => id.trim())
      ));

      const validDealbreakers = Array.from(new Set(
        dealbreakers
          .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
          .map((id: string) => id.trim())
      ));

      if (validInterests.length === 0) {
        return NextResponse.json(
          { error: 'At least one interest is required' },
          { status: 400 }
        );
      }

      if (validDealbreakers.length === 0) {
        return NextResponse.json(
          { error: 'At least one dealbreaker is required' },
          { status: 400 }
        );
      }

      console.log('[Onboarding API] Saving onboarding data atomically:', {
        userId: user.id,
        interestIds: validInterests,
        subcategoryData: subcategoryData,
        dealbreakerIds: validDealbreakers,
      });

      // Try atomic RPC function first
      const { error: completeError } = await supabase.rpc('complete_onboarding_atomic', {
        p_user_id: user.id,
        p_interest_ids: validInterests,
        p_subcategory_data: subcategoryData,
        p_dealbreaker_ids: validDealbreakers
      });

      if (completeError) {
        // Check if RPC function doesn't exist (fallback to manual transaction-like flow)
        const isRpcMissing = completeError.message?.includes('function') || 
                            completeError.message?.includes('does not exist') ||
                            completeError.code === '42883';
        
        if (isRpcMissing) {
          console.log('[Onboarding API] RPC function not found, using manual transaction-like flow');
          
          // Manual transaction-like flow: delete old rows, insert new rows, update profile
          // Delete existing data
          const { error: deleteInterestsError } = await supabase
            .from('user_interests')
            .delete()
            .eq('user_id', user.id);
          
          if (deleteInterestsError) {
            console.error('[Onboarding API] Error deleting user_interests:', deleteInterestsError);
            throw deleteInterestsError;
          }

          const { error: deleteSubcategoriesError } = await supabase
            .from('user_subcategories')
            .delete()
            .eq('user_id', user.id);
          
          if (deleteSubcategoriesError) {
            console.error('[Onboarding API] Error deleting user_subcategories:', deleteSubcategoriesError);
            throw deleteSubcategoriesError;
          }

          const { error: deleteDealbreakersError } = await supabase
            .from('user_dealbreakers')
            .delete()
            .eq('user_id', user.id);
          
          if (deleteDealbreakersError) {
            console.error('[Onboarding API] Error deleting user_dealbreakers:', deleteDealbreakersError);
            throw deleteDealbreakersError;
          }

          // Insert new data
          if (validInterests.length > 0) {
            const interestRows = validInterests.map((interest_id: string) => ({
              user_id: user.id,
              interest_id
            }));

            const { error: insertInterestsError } = await supabase
              .from('user_interests')
              .insert(interestRows);

            if (insertInterestsError) {
              console.error('[Onboarding API] Error inserting user_interests:', insertInterestsError);
              throw insertInterestsError;
            }
          }

          if (subcategoryData.length > 0) {
            const subcategoryRows = subcategoryData.map((item: { subcategory_id: string; interest_id: string }) => ({
              user_id: user.id,
              subcategory_id: item.subcategory_id,
              interest_id: item.interest_id
            }));

            const { error: insertSubcategoriesError } = await supabase
              .from('user_subcategories')
              .insert(subcategoryRows);

            if (insertSubcategoriesError) {
              console.error('[Onboarding API] Error inserting user_subcategories:', insertSubcategoriesError);
              throw insertSubcategoriesError;
            }
          }

          if (validDealbreakers.length > 0) {
            const dealbreakerRows = validDealbreakers.map((dealbreaker_id: string) => ({
              user_id: user.id,
              dealbreaker_id
            }));

            const { error: insertDealbreakersError } = await supabase
              .from('user_dealbreakers')
              .insert(dealbreakerRows);

            if (insertDealbreakersError) {
              console.error('[Onboarding API] Error inserting user_dealbreakers:', insertDealbreakersError);
              throw insertDealbreakersError;
            }
          }

          // Update profile with counts and completion status
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              onboarding_step: 'complete',
              onboarding_complete: true,
              interests_count: validInterests.length,
              subcategories_count: subcategoryData.length,
              dealbreakers_count: validDealbreakers.length,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (profileError) {
            console.error('[Onboarding API] Error updating profile:', profileError);
            throw profileError;
          }

          console.log('[Onboarding API] Successfully saved onboarding data (manual flow)');
        } else {
          // RPC exists but failed for another reason
          console.error('[Onboarding API] Atomic function error:', completeError);
          throw completeError;
        }
      } else {
        // Atomic function succeeded
        console.log('[Onboarding API] Successfully saved onboarding data (atomic RPC)');
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding progress saved successfully'
    });

  } catch (error) {
    console.error('Error saving onboarding data:', error);
    return NextResponse.json(
      { error: "Failed to save onboarding progress" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve user's onboarding data
export async function GET() {
  const supabase = await getServerSupabase();
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

    return NextResponse.json({
      interests,
      subcategories,
      dealbreakers,
      interests_count: profile?.interests_count || 0,
      subcategories_count: profile?.subcategories_count || 0,
      dealbreakers_count: profile?.dealbreakers_count || 0
    });

  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding data" },
      { status: 500 }
    );
  }
}
