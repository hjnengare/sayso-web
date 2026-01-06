import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase/server";
import { performance as nodePerformance } from 'perf_hooks';

/**
 * Helper function to update profile onboarding status with verification
 * Uses .select().single() to ensure the update actually succeeded
 */
async function updateProfileOnboarding(
  supabase: any,
  userId: string,
  step: string,
  complete: boolean
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      onboarding_step: step,
      onboarding_complete: complete,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('onboarding_step, onboarding_complete')
    .single();

  if (error) {
    console.error('[Onboarding API] Profile update error:', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  // Hard assert: verify the update actually worked
  if (!data || data.onboarding_step !== step || data.onboarding_complete !== complete) {
    const errorMessage = `Profile onboarding fields did not update correctly. Expected: step=${step}, complete=${complete}, Got: step=${data?.onboarding_step}, complete=${data?.onboarding_complete}`;
    console.error('[Onboarding API]', errorMessage);
    throw new Error(errorMessage);
  }

  console.log('[Onboarding API] Profile update verified:', {
    onboarding_step: data.onboarding_step,
    onboarding_complete: data.onboarding_complete,
  });

  return data;
}

export async function POST(req: Request) {
  const startTime = nodePerformance.now();
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { step, interests, subcategories, dealbreakers, markComplete } = await req.json();

    // Handle case where we just want to mark onboarding as complete (from /complete page)
    if (step === 'complete' && markComplete === true && !interests && !subcategories && !dealbreakers) {
      console.log('[Onboarding API] Marking onboarding as complete only (no data to save)');
      
      // Just update the profile to mark as complete
      await updateProfileOnboarding(supabase, user.id, 'complete', true);
      
      const totalTime = nodePerformance.now() - startTime;
      console.log('[Onboarding API] Onboarding marked as complete', {
        userId: user.id,
        totalTime: `${totalTime.toFixed(2)}ms`
      });

      return NextResponse.json({ 
        success: true,
        message: 'Onboarding marked as complete'
      });
    }

    if (step === 'complete') {
      const writeStart = nodePerformance.now();
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
      })).filter(sub => {
        // Filter out subcategories with missing required fields
        const isValid = sub.subcategory_id && sub.interest_id;
        if (!isValid) {
          console.warn('[Onboarding API] Invalid subcategory entry:', sub);
        }
        return isValid;
      });

      // Validate data before attempting save
      if (interests.length === 0) {
        return NextResponse.json(
          { error: 'At least one interest is required' },
          { status: 400 }
        );
      }

      // Validate that all subcategories have interest_ids if provided
      const invalidSubcategories = subcategoryData.filter(sub => !sub.interest_id || !sub.subcategory_id);
      if (invalidSubcategories.length > 0 && subcategories.length > 0) {
        console.error('[Onboarding API] Invalid subcategory data:', invalidSubcategories);
        return NextResponse.json(
          { error: 'All subcategories must have valid subcategory_id and interest_id' },
          { status: 400 }
        );
      }

      console.log('[Onboarding API] Saving onboarding data:', {
        userId: user.id,
        interestIds: interests,
        interestIdsType: Array.isArray(interests) ? 'array' : typeof interests,
        interestIdsLength: Array.isArray(interests) ? interests.length : 'N/A',
        subcategoryData: subcategoryData,
        subcategoryDataLength: subcategoryData.length,
        dealbreakerIds: dealbreakers,
        dealbreakersLength: dealbreakers.length,
      });

      // Try atomic function first, fallback to individual steps if function doesn't exist
      let useAtomic = true;
      const { error: completeError, data: completeData } = await supabase.rpc('complete_onboarding_atomic', {
        p_user_id: user.id,
        p_interest_ids: interests,
        p_subcategory_data: subcategoryData,
        p_dealbreaker_ids: dealbreakers
      });

      console.log('[Onboarding API] complete_onboarding_atomic result:', {
        success: !completeError,
        error: completeError?.message,
        code: completeError?.code,
        details: completeError?.details,
        hint: completeError?.hint,
      });

      // Always update profile after atomic function succeeds
      // Even though atomic function should update it, we verify and force-update to be bulletproof
      if (!completeError) {
        console.log('[Onboarding API] Atomic function succeeded, updating profile...');
        try {
          await updateProfileOnboarding(supabase, user.id, 'complete', true);
        } catch (profileError) {
          console.error('[Onboarding API] Failed to update profile after atomic function:', profileError);
          throw profileError;
        }
      }

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

        // Update profile with verification
        await updateProfileOnboarding(supabase, user.id, 'complete', true);
      }

      const writeTime = nodePerformance.now() - writeStart;
      const totalTime = nodePerformance.now() - startTime;

      console.log('[Onboarding API] Complete step saved', {
        userId: user.id,
        interestsCount: interests?.length || 0,
        subcategoriesCount: subcategories?.length || 0,
        dealbreakersCount: dealbreakers?.length || 0,
        writeTime: `${writeTime.toFixed(2)}ms`,
        totalTime: `${totalTime.toFixed(2)}ms`
      });

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

      // Update profile step (only for individual steps) with verification
      // For deal-breakers step, save data but DON'T mark as complete - that happens on /complete page
      // Also update the appropriate count field based on the step
      if (step === 'deal-breakers') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .update({
            onboarding_step: step,
            dealbreakers_count: dealbreakers?.length || 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select('onboarding_step, dealbreakers_count')
          .single();

        if (profileError) {
          throw profileError;
        }

        // Verify the update actually worked
        if (!profileData || profileData.onboarding_step !== step) {
          throw new Error(`Profile onboarding_step did not update correctly. Expected: ${step}, Got: ${profileData?.onboarding_step}`);
        }
      } else {
        await updateProfileOnboarding(supabase, user.id, step, false);
      }
    }

    const totalTime = nodePerformance.now() - startTime;
    
    console.log('[Onboarding API] Save completed', {
      userId: user.id,
      step: step || 'complete',
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding progress saved successfully',
      performance: {
        totalTime: totalTime
      }
    });

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Onboarding API] Error saving onboarding data:', {
      error: error?.message || error,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      totalTime: `${totalTime.toFixed(2)}ms`
    });
    
    // Provide more specific error messages
    const errorMessage = error?.message || error?.details || "Failed to save onboarding progress";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        errorCode: error?.code,
        performance: { totalTime }
      },
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
