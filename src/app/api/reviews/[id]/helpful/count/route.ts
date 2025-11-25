import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../../lib/supabase/server';

type RouteContext = {
  params: { id: string };
};

/**
 * GET /api/reviews/[id]/helpful/count
 * Get total helpful vote count for a review
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const reviewId = params.id;

  try {
    const supabase = await getServerSupabase();

    const { count, error } = await supabase
      .from('review_helpful_votes')
      .select('review_id', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    if (error) {
      console.error('Error fetching helpful count:', error);
      return NextResponse.json(
        { error: 'Failed to fetch helpful count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    console.error('GET /reviews/[id]/helpful/count unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

