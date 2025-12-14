import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import {
  getCurrentUserId,
  getUserProfile,
  updateLastActive,
} from '@/app/lib/services/userService';
import type { ApiResponse, UpdatePreferencesPayload, PrivacySettings } from '@/app/lib/types/user';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/preferences
 * Fetches the current user's interests, subcategories, and deal-breakers
 * Returns empty arrays if tables don't exist or user has no preferences
 */
export async function GET() {
  try {
    const supabase = await getServerSupabase();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[Preferences API] No authenticated user');
      return NextResponse.json(
        {
          interests: [],
          subcategories: [],
          dealbreakers: [],
        },
        { status: 200 }
      );
    }

    console.log('[Preferences API] Fetching preferences for user:', user.id);

    // Fetch user's interests - handle gracefully if table doesn't exist
    let interestIds: string[] = [];
    const { data: interestsData, error: interestsError } = await supabase
      .from('user_interests')
      .select('interest_id')
      .eq('user_id', user.id);

    console.log('[Preferences API] user_interests query result:', {
      hasData: !!interestsData,
      dataLength: interestsData?.length || 0,
      data: interestsData,
      error: interestsError?.message,
    });

    if (interestsError) {
      console.warn('[Preferences API] Warning fetching interests:', interestsError.message);
      // Don't throw - table might not exist yet
    } else if (interestsData) {
      interestIds = interestsData.map(i => i.interest_id);
      console.log('[Preferences API] Extracted interest IDs:', interestIds);
    }

    // Fetch user's subcategories
    let subcategoryIds: string[] = [];
    const { data: subcategoriesData, error: subcategoriesError } = await supabase
      .from('user_subcategories')
      .select('subcategory_id')
      .eq('user_id', user.id);

    if (subcategoriesError) {
      console.warn('[Preferences API] Warning fetching subcategories:', subcategoriesError.message);
      // Don't throw - table might not exist yet
    } else if (subcategoriesData) {
      subcategoryIds = subcategoriesData.map(s => s.subcategory_id);
    }

    // Fetch user's deal-breakers
    let dealbreakersIds: string[] = [];
    const { data: dealbreakersData, error: dealbreakersError } = await supabase
      .from('user_dealbreakers')
      .select('dealbreaker_id')
      .eq('user_id', user.id);

    if (dealbreakersError) {
      console.warn('[Preferences API] Warning fetching dealbreakers:', dealbreakersError.message);
      // Don't throw - table might not exist yet
    } else if (dealbreakersData) {
      dealbreakersIds = dealbreakersData.map(d => d.dealbreaker_id);
    }

    // Get the actual names/details for interests
    let interestDetails: any[] = [];
    if (interestIds.length > 0) {
      console.log('[Preferences API] Fetching interest details for IDs:', interestIds);
      const { data, error } = await supabase
        .from('interests')
        .select('id, name')
        .in('id', interestIds);

      console.log('[Preferences API] interests table query result:', {
        hasData: !!data,
        dataLength: data?.length || 0,
        data: data,
        error: error?.message,
      });

      if (error) {
        console.warn('[Preferences API] Warning fetching interest details:', error.message);
      } else {
        interestDetails = data || [];
      }
    } else {
      console.log('[Preferences API] No interest IDs to fetch details for');
    }

    // Get the actual names/details for subcategories
    let subcategoryDetails: any[] = [];
    if (subcategoryIds.length > 0) {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name')
        .in('id', subcategoryIds);

      if (error) {
        console.warn('[Preferences API] Warning fetching subcategory details:', error.message);
      } else {
        subcategoryDetails = data || [];
      }
    }

    // Get the actual names/details for deal-breakers
    let dealbreakersDetails: any[] = [];
    if (dealbreakersIds.length > 0) {
      const { data, error } = await supabase
        .from('dealbreakers')
        .select('id, name')
        .in('id', dealbreakersIds);

      if (error) {
        console.warn('[Preferences API] Warning fetching dealbreaker details:', error.message);
      } else {
        dealbreakersDetails = data || [];
      }
    }

    console.log('[Preferences API] Successfully fetched preferences:', {
      interests: interestDetails.length,
      subcategories: subcategoryDetails.length,
      dealbreakers: dealbreakersDetails.length,
    });

    return NextResponse.json({
      interests: interestDetails || [],
      subcategories: subcategoryDetails || [],
      dealbreakers: dealbreakersDetails || [],
    });
  } catch (error: any) {
    console.error('[Preferences API] Unexpected error:', error);
    // Return empty preferences instead of error to prevent UI breaking
    return NextResponse.json(
      {
        interests: [],
        subcategories: [],
        dealbreakers: [],
      },
      { status: 200 }
    );
  }
}

/**
 * PUT /api/user/preferences
 * Update user preferences (interests, deal-breakers, privacy settings)
 */
export async function PUT(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const userId = await getCurrentUserId(supabase);

    if (!userId) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
        },
        { status: 401 }
      );
    }

    const body: UpdatePreferencesPayload = await req.json();

    // Get current profile to merge privacy settings
    const currentProfile = await getUserProfile(supabase, userId);
    const currentPrivacySettings: PrivacySettings = currentProfile?.privacy_settings || {
      showActivity: true,
      showStats: true,
      showSavedBusinesses: false,
    };

    // Update privacy settings if provided
    if (body.privacy_settings) {
      const updatedPrivacySettings: PrivacySettings = {
        ...currentPrivacySettings,
        ...body.privacy_settings,
      };

      const { error: privacyError } = await supabase
        .from('profiles')
        .update({
          privacy_settings: updatedPrivacySettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (privacyError) {
        console.error('[Preferences API] Error updating privacy settings:', privacyError);
        return NextResponse.json(
          {
            data: null,
            error: {
              message: 'Failed to update privacy settings',
              code: 'UPDATE_FAILED',
            },
          },
          { status: 500 }
        );
      }
    }

    // Update interests if provided
    if (body.interests !== undefined) {
      // Delete existing interests
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', userId);

      // Insert new interests
      if (body.interests.length > 0) {
        const interestsToInsert = body.interests.map((interestId) => ({
          user_id: userId,
          interest_id: interestId,
        }));

        const { error: interestsError } = await supabase
          .from('user_interests')
          .insert(interestsToInsert);

        if (interestsError) {
          console.error('[Preferences API] Error updating interests:', interestsError);
          // Continue - don't fail the whole request
        }
      }
    }

    // Update deal-breakers if provided
    if (body.dealBreakers !== undefined) {
      // Delete existing deal-breakers
      await supabase
        .from('user_dealbreakers')
        .delete()
        .eq('user_id', userId);

      // Insert new deal-breakers
      if (body.dealBreakers.length > 0) {
        const dealbreakersToInsert = body.dealBreakers.map((dealbreakerId) => ({
          user_id: userId,
          dealbreaker_id: dealbreakerId,
        }));

        const { error: dealbreakersError } = await supabase
          .from('user_dealbreakers')
          .insert(dealbreakersToInsert);

        if (dealbreakersError) {
          console.error('[Preferences API] Error updating deal-breakers:', dealbreakersError);
          // Continue - don't fail the whole request
        }
      }
    }

    // Update last active
    await updateLastActive(supabase, userId);

    // Return updated preferences by calling GET logic
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: 'User not found',
            code: 'NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    // Fetch updated preferences
    let interestIds: string[] = [];
    const { data: interestsData } = await supabase
      .from('user_interests')
      .select('interest_id')
      .eq('user_id', user.id);

    if (interestsData) {
      interestIds = interestsData.map(i => i.interest_id);
    }

    let subcategoryIds: string[] = [];
    const { data: subcategoriesData } = await supabase
      .from('user_subcategories')
      .select('subcategory_id')
      .eq('user_id', user.id);

    if (subcategoriesData) {
      subcategoryIds = subcategoriesData.map(s => s.subcategory_id);
    }

    let dealbreakersIds: string[] = [];
    const { data: dealbreakersData } = await supabase
      .from('user_dealbreakers')
      .select('dealbreaker_id')
      .eq('user_id', user.id);

    if (dealbreakersData) {
      dealbreakersIds = dealbreakersData.map(d => d.dealbreaker_id);
    }

    // Get details
    const [interestsResult, subcategoriesResult, dealbreakersResult] = await Promise.all([
      interestIds.length > 0
        ? supabase.from('interests').select('id, name').in('id', interestIds)
        : { data: [], error: null },
      subcategoryIds.length > 0
        ? supabase.from('subcategories').select('id, name').in('id', subcategoryIds)
        : { data: [], error: null },
      dealbreakersIds.length > 0
        ? supabase.from('dealbreakers').select('id, name').in('id', dealbreakersIds)
        : { data: [], error: null },
    ]);

    const updatedProfile = await getUserProfile(supabase, userId);

    return NextResponse.json({
      data: {
        interests: interestsResult.data || [],
        subcategories: subcategoriesResult.data || [],
        dealbreakers: dealbreakersResult.data || [],
        privacy_settings: updatedProfile?.privacy_settings || currentPrivacySettings,
      },
      error: null,
    });
  } catch (error: any) {
    console.error('[Preferences API] Error:', error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: error.message || 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

