import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import {
  getCurrentUserId,
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
export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const userId = await getCurrentUserId(supabase);

    if (!userId) {
      console.error('[Profile API] Auth error: No user ID');
      return NextResponse.json<ApiResponse<EnhancedProfile>>(
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

    // Update last active
    try {
      await updateLastActive(supabase, userId);
    } catch (lastActiveError: any) {
      console.warn('[Profile API] Failed to update last active:', lastActiveError?.message);
      // Continue even if this fails
    }

    const profile = await getUserProfile(supabase, userId);

    if (!profile) {
      console.error('[Profile API] Profile not found for user:', userId);
      return NextResponse.json(
        {
          data: null,
          error: {
            message: 'Profile not found',
            code: 'NOT_FOUND',
            details: `No profile record found for user ${userId}`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<EnhancedProfile>>({
      data: profile,
      error: null,
    });
  } catch (error: any) {
    console.error('[Profile API] Unexpected error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      {
        data: null,
        error: {
          message: error?.message || 'Internal server error',
          code: 'INTERNAL_ERROR',
          details: error?.stack || String(error),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Update user profile
 */
export async function PUT(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const userId = await getCurrentUserId(supabase);

    if (!userId) {
      return NextResponse.json<ApiResponse<EnhancedProfile>>(
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

    const body: UpdateProfilePayload = await req.json();

    // Validate payload
    const validation = validateProfileUpdate(body);
    if (!validation.valid) {
      return NextResponse.json<ApiResponse<EnhancedProfile>>(
        {
          data: null,
          error: {
            message: validation.errors.join(', '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 }
      );
    }

    // Update profile
    const updatedProfile = await updateUserProfile(supabase, userId, body);

    if (!updatedProfile) {
      return NextResponse.json<ApiResponse<EnhancedProfile>>(
        {
          data: null,
          error: {
            message: 'Failed to update profile',
            code: 'UPDATE_FAILED',
          },
        },
        { status: 500 }
      );
    }

    // Update last active
    await updateLastActive(supabase, userId);

    return NextResponse.json<ApiResponse<EnhancedProfile>>({
      data: updatedProfile,
      error: null,
    });
  } catch (error: any) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json<ApiResponse<EnhancedProfile>>(
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

