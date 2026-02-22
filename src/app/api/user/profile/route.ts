import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import {
  getUserProfile,
  updateUserProfile,
  updateLastActive,
} from '@/app/lib/services/userService';
import { validateProfileUpdate } from '@/app/lib/utils/validation';
import type { ApiResponse, EnhancedProfile, UpdateProfilePayload } from '@/app/lib/types/user';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/profile
 * Get current user's full profile
 */
export const GET = withUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    try {
      await updateLastActive(supabase, user.id);
    } catch (lastActiveError: any) {
      console.warn('[Profile API] Failed to update last active:', lastActiveError?.message);
    }

    const profile = await getUserProfile(supabase, user.id);

    if (!profile) {
      console.error('[Profile API] Profile not found for user:', user.id);
      return NextResponse.json(
        { data: null, error: { message: 'Profile not found', code: 'NOT_FOUND', details: `No profile record found for user ${user.id}` } },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<EnhancedProfile>>({ data: profile, error: null });
  } catch (error: any) {
    console.error('[Profile API] Unexpected error:', { message: error?.message, stack: error?.stack, name: error?.name });
    return NextResponse.json(
      { data: null, error: { message: error?.message || 'Internal server error', code: 'INTERNAL_ERROR', details: error?.stack || String(error) } },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/user/profile
 * Update user profile
 */
export const PUT = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body: UpdateProfilePayload = await req.json();

    const validation = validateProfileUpdate(body);
    if (!validation.valid) {
      return NextResponse.json<ApiResponse<EnhancedProfile>>(
        { data: null, error: { message: validation.errors.join(', '), code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const updatedProfile = await updateUserProfile(supabase, user.id, body);

    if (!updatedProfile) {
      return NextResponse.json<ApiResponse<EnhancedProfile>>(
        { data: null, error: { message: 'Failed to update profile', code: 'UPDATE_FAILED' } },
        { status: 500 }
      );
    }

    await updateLastActive(supabase, user.id);

    return NextResponse.json<ApiResponse<EnhancedProfile>>({ data: updatedProfile, error: null });
  } catch (error: any) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json<ApiResponse<EnhancedProfile>>(
      { data: null, error: { message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
});
