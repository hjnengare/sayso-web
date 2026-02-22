import { NextRequest, NextResponse } from "next/server";
import { withUser, withOptionalUser } from '@/app/api/_lib/withAuth';
import {
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
export const GET = withOptionalUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    if (!user) {
      return NextResponse.json(
        { interests: [], subcategories: [], dealbreakers: [] },
        { status: 200 }
      );
    }

    const [interestsResult, subcategoriesResult, dealbreakersResult] = await Promise.all([
      supabase.from('user_interests').select('interest_id').eq('user_id', user.id),
      supabase.from('user_subcategories').select('subcategory_id').eq('user_id', user.id),
      supabase.from('user_dealbreakers').select('dealbreaker_id').eq('user_id', user.id),
    ]);

    const { data: interestsData, error: interestsError } = interestsResult;
    const { data: subcategoriesData, error: subcategoriesError } = subcategoriesResult;
    const { data: dealbreakersData, error: dealbreakersError } = dealbreakersResult;

    if (interestsError) console.warn('[Preferences API] Warning fetching interests:', interestsError.message);
    if (subcategoriesError) console.warn('[Preferences API] Warning fetching subcategories:', subcategoriesError.message);
    if (dealbreakersError) console.warn('[Preferences API] Warning fetching dealbreakers:', dealbreakersError.message);

    const interestIds = interestsData ? interestsData.map(i => i.interest_id) : [];
    const subcategoryIds = subcategoriesData ? subcategoriesData.map(s => s.subcategory_id) : [];
    const dealbreakersIds = dealbreakersData ? dealbreakersData.map(d => d.dealbreaker_id) : [];

    const interestDetails = interestIds.map(id => ({ id, name: id }));
    const subcategoryDetails = subcategoryIds.map(id => ({ id, name: id }));
    const dealbreakersDetails = dealbreakersIds.map(id => ({ id, name: id }));

    return NextResponse.json({
      interests: interestDetails,
      subcategories: subcategoryDetails,
      dealbreakers: dealbreakersDetails,
    });
  } catch (error: any) {
    console.error('[Preferences API] Unexpected error:', error);
    return NextResponse.json(
      { interests: [], subcategories: [], dealbreakers: [] },
      { status: 200 }
    );
  }
});

/**
 * PUT /api/user/preferences
 * Update user preferences (interests, deal-breakers, privacy settings)
 */
export const PUT = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const userId = user.id;

    const body: UpdatePreferencesPayload = await req.json();

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

    await updateLastActive(supabase, userId);

    let interestIds: string[] = [];
    const { data: interestsData } = await supabase
      .from('user_interests')
      .select('interest_id')
      .eq('user_id', userId);

    if (interestsData) {
      interestIds = interestsData.map(i => i.interest_id);
    }

    let subcategoryIds: string[] = [];
    const { data: subcategoriesData } = await supabase
      .from('user_subcategories')
      .select('subcategory_id')
      .eq('user_id', userId);

    if (subcategoriesData) {
      subcategoryIds = subcategoriesData.map(s => s.subcategory_id);
    }

    let dealbreakersIds: string[] = [];
    const { data: dealbreakersData } = await supabase
      .from('user_dealbreakers')
      .select('dealbreaker_id')
      .eq('user_id', userId);

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
});

