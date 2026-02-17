import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { isValidUUID, isOptimisticId } from '../../../../../lib/utils/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/reviews/[id]/helpful/count
 * Get total helpful vote count for a review
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const reviewId = (id || '').trim();

  // Skip optimistic IDs - they don't exist in the database yet, return 0
  if (isOptimisticId(reviewId) || !isValidUUID(reviewId)) {
    return NextResponse.json({ count: 0, optimistic: true });
  }

  try {
    const supabase = await getServerSupabase();

    const { count, error } = await supabase
      .from('review_helpful_votes')
      .select('review_id', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    if (error) {
      console.error('Error fetching helpful count:', error);
      // Return 0 instead of error to maintain UX
      return NextResponse.json({ count: 0 });
    }

    // Always return a valid count, default to 0 if null/undefined
    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    console.error('GET /reviews/[id]/helpful/count unexpected error:', err);
    // Return 0 instead of error to maintain UX
    return NextResponse.json({ count: 0 });
  }
}

