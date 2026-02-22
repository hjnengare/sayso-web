import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import {
  getUserActivity,
  updateLastActive,
} from '@/app/lib/services/userService';
import type {
  ApiResponse,
  UserActivityItem,
  PaginatedResponse,
  PaginationParams,
} from '@/app/lib/types/user';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/activity
 * Get user activity feed (paginated)
 */
export const GET = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const userId = user.id;

    await updateLastActive(supabase, userId);

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const params: PaginationParams = {
      page: Math.max(1, page),
      pageSize: Math.min(Math.max(1, pageSize), 100), // Max 100 per page
    };

    const { items, total } = await getUserActivity(supabase, userId, params);

    const totalPages = Math.ceil(total / params.pageSize);

    const response: PaginatedResponse<UserActivityItem> = {
      data: items,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages,
        hasMore: params.page < totalPages,
      },
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<UserActivityItem>>>({
      data: response,
      error: null,
    });
  } catch (error: any) {
    console.error('[Activity API] Error:', error);
    return NextResponse.json<
      ApiResponse<PaginatedResponse<UserActivityItem>>
    >(
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

