import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import {
  getCurrentUserId,
  getUserStats,
  updateLastActive,
} from '@/app/lib/services/userService';
import type { ApiResponse, UserStats } from '@/app/lib/types/user';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/stats
 * Get user statistics
 */
export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const userId = await getCurrentUserId(supabase);

    if (!userId) {
      return NextResponse.json<ApiResponse<UserStats>>(
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
    await updateLastActive(supabase, userId);

    const stats = await getUserStats(supabase, userId);

    if (!stats) {
      return NextResponse.json<ApiResponse<UserStats>>(
        {
          data: null,
          error: {
            message: 'Failed to fetch stats',
            code: 'FETCH_FAILED',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<UserStats>>({
      data: stats,
      error: null,
    });
  } catch (error: any) {
    console.error('[Stats API] Error:', error);
    return NextResponse.json<ApiResponse<UserStats>>(
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

