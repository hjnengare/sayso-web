import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import {
  getUserStats,
  updateLastActive,
} from '@/app/lib/services/userService';
import type { ApiResponse, UserStats } from '@/app/lib/types/user';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/stats
 * Get user statistics
 */
export const GET = withUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    const userId = user.id;

    try {
      await updateLastActive(supabase, userId);
    } catch (lastActiveError: any) {
      console.warn('[Stats API] Failed to update last active:', lastActiveError?.message);
      // Continue even if this fails
    }

    const stats = await getUserStats(supabase, userId);

    // If stats is null, return default stats (user might not have any activity yet)
    if (!stats) {
      console.warn('[Stats API] getUserStats returned null, returning default stats');
      const defaultStats: UserStats = {
        totalReviewsWritten: 0,
        totalHelpfulVotesGiven: 0,
        totalBusinessesSaved: 0,
        accountCreationDate: new Date().toISOString(),
        lastActiveDate: new Date().toISOString(),
        helpfulVotesReceived: 0,
      };
      return NextResponse.json<ApiResponse<UserStats>>({
        data: defaultStats,
        error: null,
      });
    }

    return NextResponse.json<ApiResponse<UserStats>>({
      data: stats,
      error: null,
    });
  } catch (error: any) {
    console.error('[Stats API] Unexpected error:', {
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
});

