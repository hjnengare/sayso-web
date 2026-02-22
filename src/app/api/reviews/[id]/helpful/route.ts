import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { isValidUUID, isOptimisticId } from '../../../../lib/utils/validation';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/reviews/[id]/helpful
 * Mark review as helpful — requires auth
 */
export const POST = withUser(async (_req: NextRequest, { user, supabase, params }) => {
  const { id } = await (params as RouteContext['params']);
  const reviewId = (id || '').trim();

  if (isOptimisticId(reviewId) || !isValidUUID(reviewId)) {
    return NextResponse.json({ helpful: false, optimistic: true }, { status: 200 });
  }

  try {
    const { error } = await supabase
      .from('review_helpful_votes')
      .insert({ review_id: reviewId, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ helpful: true, alreadyVoted: true }, { status: 200 });
      }
      console.error('Error inserting helpful vote:', error);
      return NextResponse.json({ error: 'Failed to add helpful vote' }, { status: 500 });
    }

    try {
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('user_id, profiles!reviews_user_id_fkey(display_name, username)')
        .eq('id', reviewId)
        .single();

      if (reviewData && reviewData.user_id) {
        const { data: voterData } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .single();

        const voterName = voterData?.display_name || voterData?.username || 'Someone';
        await supabase.rpc('create_helpful_notification', {
          p_review_owner_id: reviewData.user_id,
          p_voter_id: user.id,
          p_review_id: reviewId,
          p_voter_name: voterName
        });
      }
    } catch (notifError) {
      console.error('Failed to create helpful notification:', notifError);
    }

    try {
      const { data: reviewRow } = await supabase.from('reviews').select('business_id').eq('id', reviewId).maybeSingle();
      if (reviewRow?.business_id) {
        const { data: businessRow } = await supabase.from('businesses').select('slug, id').eq('id', reviewRow.business_id).maybeSingle();
        if (businessRow) {
          revalidatePath(`/business/${businessRow.slug || businessRow.id}`);
        }
      }
    } catch (revalErr) {
      console.warn('Helpful: revalidatePath failed', revalErr);
    }

    return NextResponse.json({ helpful: true, alreadyVoted: false });
  } catch (err) {
    console.error('POST /reviews/[id]/helpful unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
});

/**
 * DELETE /api/reviews/[id]/helpful
 * Remove helpful vote — requires auth
 */
export const DELETE = withUser(async (_req: NextRequest, { user, supabase, params }) => {
  const { id } = await (params as RouteContext['params']);
  const reviewId = (id || '').trim();

  if (isOptimisticId(reviewId) || !isValidUUID(reviewId)) {
    return NextResponse.json({ helpful: false, optimistic: true }, { status: 200 });
  }

  try {
    const { error } = await supabase
      .from('review_helpful_votes')
      .delete()
      .match({ review_id: reviewId, user_id: user.id });

    if (error) {
      console.error('Error deleting helpful vote:', error);
      return NextResponse.json({ error: 'Failed to remove helpful vote' }, { status: 500 });
    }

    try {
      const { data: reviewRow } = await supabase.from('reviews').select('business_id').eq('id', reviewId).maybeSingle();
      if (reviewRow?.business_id) {
        const { data: businessRow } = await supabase.from('businesses').select('slug, id').eq('id', reviewRow.business_id).maybeSingle();
        if (businessRow) {
          revalidatePath(`/business/${businessRow.slug || businessRow.id}`);
        }
      }
    } catch (revalErr) {
      console.warn('Helpful: revalidatePath failed', revalErr);
    }

    return NextResponse.json({ helpful: false });
  } catch (err) {
    console.error('DELETE /reviews/[id]/helpful unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
});

/**
 * GET /api/reviews/[id]/helpful
 * Check if current user marked this review as helpful — optional auth (returns false if unauthenticated)
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const reviewId = (id || '').trim();

  if (isOptimisticId(reviewId) || !isValidUUID(reviewId)) {
    return NextResponse.json({ helpful: false, optimistic: true });
  }

  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ helpful: false });
    }

    const { data, error } = await supabase
      .from('review_helpful_votes')
      .select('review_id')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking helpful status:', error);
      return NextResponse.json({ error: 'Failed to check helpful status' }, { status: 500 });
    }

    return NextResponse.json({ helpful: !!data });
  } catch (err) {
    console.error('GET /reviews/[id]/helpful unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
