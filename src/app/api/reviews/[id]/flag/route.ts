import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { FlagRateLimiter } from '../../../../lib/utils/flagRateLimiter';
import { isOptimisticId, isValidUUID } from '../../../../lib/utils/validation';

type RouteContext = { params: Promise<{ id: string }> };

const FLAG_REASONS = ['spam', 'inappropriate', 'harassment', 'off_topic', 'other'] as const;
const AUTO_HIDE_THRESHOLD = 5;

function isTransientReviewId(id: string): boolean {
  return isOptimisticId(id) || !isValidUUID(id);
}

/**
 * POST /api/reviews/[id]/flag
 * Flag an inappropriate review — requires auth
 */
export const POST = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id } = await (params as RouteContext['params']);
    const reviewId = (id || '').trim();

    if (isTransientReviewId(reviewId)) {
      return NextResponse.json({ success: false, flagged: false, optimistic: true }, { status: 200 });
    }

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, business_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot flag your own review' }, { status: 400 });
    }

    const { data: existingFlag } = await supabase
      .from('review_flags')
      .select('id')
      .eq('review_id', reviewId)
      .eq('flagged_by', user.id)
      .maybeSingle();

    if (existingFlag) {
      return NextResponse.json({ error: 'You have already flagged this review' }, { status: 400 });
    }

    const rateLimitResult = await FlagRateLimiter.checkRateLimit(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: rateLimitResult.error || 'Rate limit exceeded',
          rateLimit: { remainingAttempts: rateLimitResult.remainingAttempts, resetAt: rateLimitResult.resetAt.toISOString() },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remainingAttempts.toString(),
            'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
          },
        }
      );
    }

    const body = await req.json();
    const { reason, details } = body;

    if (!reason || !FLAG_REASONS.includes(reason as (typeof FLAG_REASONS)[number])) {
      return NextResponse.json({ error: 'Invalid flag reason', validReasons: FLAG_REASONS }, { status: 400 });
    }

    if (reason === 'other' && (!details || details.trim().length === 0)) {
      return NextResponse.json({ error: 'Details are required when reason is "other"' }, { status: 400 });
    }

    const { data: flag, error: flagError } = await supabase
      .from('review_flags')
      .insert({ review_id: reviewId, flagged_by: user.id, reason, details: details?.trim() || null, status: 'pending' })
      .select()
      .single();

    if (flagError) {
      console.error('Error creating flag:', flagError);
      return NextResponse.json({ error: 'Failed to flag review', details: flagError.message }, { status: 500 });
    }

    const { count: flagCount, error: countError } = await supabase
      .from('review_flags')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId)
      .eq('status', 'pending');

    if (countError) console.error('Error counting flags:', countError);

    if (flagCount && flagCount >= AUTO_HIDE_THRESHOLD) {
      console.warn(`Review ${reviewId} has been flagged ${flagCount} times (threshold: ${AUTO_HIDE_THRESHOLD}). Review should be auto-hidden.`);
    }

    return NextResponse.json({
      success: true,
      message: 'Review flagged successfully',
      flag,
      autoHidden: flagCount && flagCount >= AUTO_HIDE_THRESHOLD,
    });
  } catch (error) {
    console.error('Error in flag review API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * GET /api/reviews/[id]/flag
 * Check if current user has flagged this review — optional auth (returns false if unauthenticated)
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const reviewId = (id || '').trim();

    if (isTransientReviewId(reviewId)) {
      return NextResponse.json({ flagged: false, flag: null, optimistic: true });
    }

    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ flagged: false, flag: null });
    }

    const { data: flag, error: flagError } = await supabase
      .from('review_flags')
      .select('id, reason, details, status, created_at')
      .eq('review_id', reviewId)
      .eq('flagged_by', user.id)
      .maybeSingle();

    if (flagError) {
      console.error('Error checking flag status:', flagError);
      return NextResponse.json({ error: 'Failed to check flag status', details: flagError.message }, { status: 500 });
    }

    return NextResponse.json({ flagged: !!flag, flag: flag || null });
  } catch (error) {
    console.error('Error in get flag status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews/[id]/flag
 * Remove flag — requires auth
 */
export const DELETE = withUser(async (_req: NextRequest, { user, supabase, params }) => {
  try {
    const { id } = await (params as RouteContext['params']);
    const reviewId = (id || '').trim();

    if (isTransientReviewId(reviewId)) {
      return NextResponse.json({ success: true, flagged: false, optimistic: true });
    }

    const { data: flag, error: flagError } = await supabase
      .from('review_flags')
      .select('id, status')
      .eq('review_id', reviewId)
      .eq('flagged_by', user.id)
      .maybeSingle();

    if (flagError) {
      console.error('Error checking flag:', flagError);
      return NextResponse.json({ error: 'Failed to check flag', details: flagError.message }, { status: 500 });
    }

    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    if (flag.status !== 'pending') {
      return NextResponse.json({ error: 'Cannot remove a flag that has already been reviewed' }, { status: 400 });
    }

    const { error: deleteError } = await supabase.from('review_flags').delete().eq('id', flag.id);

    if (deleteError) {
      console.error('Error deleting flag:', deleteError);
      return NextResponse.json({ error: 'Failed to remove flag', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Flag removed successfully' });
  } catch (error) {
    console.error('Error in remove flag API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
