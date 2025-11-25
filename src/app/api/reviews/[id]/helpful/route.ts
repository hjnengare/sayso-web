import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';

type RouteContext = {
  params: { id: string };
};

/**
 * POST /api/reviews/[id]/helpful
 * Mark review as helpful (add vote)
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const reviewId = params.id;

  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to vote' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('review_helpful_votes')
      .insert({
        review_id: reviewId,
        user_id: user.id,
      });

    // Handle duplicate vote gracefully
    if (error) {
      // PostgreSQL unique violation
      if (error.code === '23505') {
        return NextResponse.json(
          { helpful: true, alreadyVoted: true },
          { status: 200 }
        );
      }

      console.error('Error inserting helpful vote:', error);
      return NextResponse.json(
        { error: 'Failed to add helpful vote' },
        { status: 500 }
      );
    }

    return NextResponse.json({ helpful: true, alreadyVoted: false });
  } catch (err) {
    console.error('POST /reviews/[id]/helpful unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]/helpful
 * Remove helpful vote
 */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const reviewId = params.id;

  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to unvote' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('review_helpful_votes')
      .delete()
      .match({
        review_id: reviewId,
        user_id: user.id,
      });

    if (error) {
      console.error('Error deleting helpful vote:', error);
      return NextResponse.json(
        { error: 'Failed to remove helpful vote' },
        { status: 500 }
      );
    }

    // Even if nothing was deleted, returning success keeps UX simple
    return NextResponse.json({ helpful: false });
  } catch (err) {
    console.error('DELETE /reviews/[id]/helpful unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews/[id]/helpful
 * Check if current user marked this review as helpful
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const reviewId = params.id;

  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // If no user, they obviously haven't voted
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
      return NextResponse.json(
        { error: 'Failed to check helpful status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ helpful: !!data });
  } catch (err) {
    console.error('GET /reviews/[id]/helpful unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}
