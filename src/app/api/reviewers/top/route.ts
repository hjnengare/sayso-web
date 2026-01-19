import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/reviewers/top?limit=12
 * Fetches top reviewers based on review count and activity
 * PUBLIC ENDPOINT - Uses service role for unauthenticated access
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '12');

    // Use service role client for public queries
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch top reviewers with their stats
    const { data: reviewers, error } = await supabase
      .from('profiles')
      .select(`
        user_id,
        username,
        display_name,
        avatar_url,
        reviews_count,
        is_top_reviewer,
        badges_count
      `)
      .gt('reviews_count', 0) // Only users with reviews
      .order('reviews_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Top Reviewers] Error fetching reviewers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate average rating for each reviewer
    const reviewersWithRatings = await Promise.all(
      (reviewers || []).map(async (reviewer) => {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('user_id', reviewer.user_id);

        const avgRating = reviews?.length
          ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
          : 0;

        return {
          id: reviewer.user_id,
          name: reviewer.display_name || reviewer.username || 'Anonymous',
          username: reviewer.username,
          profilePicture: reviewer.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer.display_name || 'User')}&background=random`,
          reviewCount: reviewer.reviews_count || 0,
          rating: Math.round(avgRating * 10) / 10,
          badge: reviewer.is_top_reviewer ? 'top' as const : undefined,
          badgesCount: reviewer.badges_count || 0,
          location: 'Cape Town'
        };
      })
    );

    return NextResponse.json({
      ok: true,
      reviewers: reviewersWithRatings,
      total: reviewersWithRatings.length
    });

  } catch (error: any) {
    console.error('[Top Reviewers] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top reviewers', message: error.message },
      { status: 500 }
    );
  }
}
