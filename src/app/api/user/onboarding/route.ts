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

      // Map subcategories to the format expected by the atomic function
      const subcategoryData = subcategories.map(sub => ({
        subcategory_id: sub.subcategory_id || sub.id,
        interest_id: sub.interest_id
      }));

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
            throw interestsError;
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
            console.error('Error saving subcategories:', subcategoriesError);
            throw subcategoriesError;
          }
        }

        // Save dealbreakers
        if (dealbreakers && Array.isArray(dealbreakers)) {
          const { error: dealbreakersError } = await supabase.rpc('replace_user_dealbreakers', {
            p_user_id: user.id,
            p_dealbreaker_ids: dealbreakers
          });
          if (dealbreakersError) {
            console.error('Error saving dealbreakers:', dealbreakersError);
            throw dealbreakersError;
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
          console.error('Error updating profile:', profileError);
          throw profileError;
        }
      }

    } else {
      // Handle individual steps (keeping for backward compatibility)
      
      // Save interests
      if (interests && Array.isArray(interests)) {
        const { error } = await supabase.rpc('replace_user_interests', {
          p_user_id: user.id,
          p_interest_ids: interests
        });
        if (error) {
          console.error('Error saving interests:', error);
          throw error;
        }
      }

      // Save subcategories with their parent interest IDs
      if (subcategories && Array.isArray(subcategories)) {
        const subcategoryData = subcategories.map(sub => ({
          subcategory_id: sub.id,
          interest_id: sub.interest_id
        }));
        
        const { error } = await supabase.rpc('replace_user_subcategories', {
          p_user_id: user.id,
          p_subcategory_data: subcategoryData
        });
        if (error) {
          console.error('Error saving subcategories:', error);
          throw error;
        }
      }

      // Save dealbreakers
      if (dealbreakers && Array.isArray(dealbreakers)) {
        const { error } = await supabase.rpc('replace_user_dealbreakers', {
          p_user_id: user.id,
          p_dealbreaker_ids: dealbreakers
        });
        if (error) {
          console.error('Error saving dealbreakers:', error);
          throw error;
        }
      }

      // Update profile step (only for individual steps)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_step: step,
          onboarding_complete: step === 'complete',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
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
    // Get user's interests
    const { data: interests } = await supabase
      .from('user_interests')
      .select('interest_id')
      .eq('user_id', user.id);

    // Get user's subcategories
    const { data: subcategories } = await supabase
      .from('user_subcategories')
      .select('subcategory_id, interest_id')
      .eq('user_id', user.id);

    // Get user's dealbreakers
    const { data: dealbreakers } = await supabase
      .from('user_dealbreakers')
      .select('dealbreaker_id')
      .eq('user_id', user.id);

    return NextResponse.json({
      interests: interests?.map(i => i.interest_id) || [],
      subcategories: subcategories || [],
      dealbreakers: dealbreakers?.map(d => d.dealbreaker_id) || []
    });

  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding data" },
      { status: 500 }
    );
  }
}
