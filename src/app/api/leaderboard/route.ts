import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard
 * Get top contributors leaderboard (public read — no auth required).
 * Used by the public Leaderboard page; guests can view rankings/scores/badges.
 * Write actions (like, follow, claim rewards) are enforced elsewhere and require auth.
 *
 * Query parameters:
 *   - limit: number - number of users to return (default: 50)
 *   - sortBy: 'reviews' | 'helpful_votes' | 'rating' - sort criteria (default: 'reviews')
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { searchParams } = new URL(req.url);
    
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'reviews';

    // Use a more efficient approach: get user stats from reviews and profiles
    // First, get all users who have written reviews
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        user_id,
        rating,
        id
      `);

    if (reviewsError) {
      console.error('[Leaderboard API] Error fetching reviews:', reviewsError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard data', details: reviewsError.message },
        { status: 500 }
      );
    }

    if (!reviewsData || reviewsData.length === 0) {
      return NextResponse.json({
        leaderboard: [],
        count: 0,
        sortBy,
      });
    }

    // Aggregate review stats by user
    const userReviewStats = new Map<string, {
      reviews: number;
      total_rating: number;
      review_ids: string[];
    }>();

    for (const review of reviewsData) {
      if (!review.user_id) continue;
      
      if (!userReviewStats.has(review.user_id)) {
        userReviewStats.set(review.user_id, {
          reviews: 0,
          total_rating: 0,
          review_ids: [],
        });
      }

      const stats = userReviewStats.get(review.user_id)!;
      stats.reviews += 1;
      stats.total_rating += review.rating || 0;
      if (review.id) {
        stats.review_ids.push(review.id);
      }
    }

    // Get helpful votes for all reviews
    const allReviewIds = Array.from(userReviewStats.values())
      .flatMap(stats => stats.review_ids);
    
    let helpfulVotesMap = new Map<string, number>();
    if (allReviewIds.length > 0) {
      // Query in batches to avoid URL length limits
      const batchSize = 100;
      for (let i = 0; i < allReviewIds.length; i += batchSize) {
        const batch = allReviewIds.slice(i, i + batchSize);
        const { data: votesData } = await supabase
          .from('review_helpful_votes')
          .select('review_id')
          .in('review_id', batch);

        if (votesData) {
          for (const vote of votesData) {
            helpfulVotesMap.set(
              vote.review_id,
              (helpfulVotesMap.get(vote.review_id) || 0) + 1
            );
          }
        }
      }
    }

    // Get user profiles
    const userIds = Array.from(userReviewStats.keys());
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url, is_top_reviewer')
      .in('user_id', userIds);

    if (profilesError) {
      console.warn('[Leaderboard API] Error fetching profiles:', profilesError);
    }

    const profilesMap = new Map<string, any>();
    if (profilesData) {
      for (const profile of profilesData) {
        profilesMap.set(profile.user_id, profile);
      }
    }

    // Combine all data
    const leaderboardData = Array.from(userReviewStats.entries()).map(([userId, stats]) => {
      const profile = profilesMap.get(userId) || {};
      const helpfulVotesReceived = stats.review_ids.reduce((sum, reviewId) => {
        return sum + (helpfulVotesMap.get(reviewId) || 0);
      }, 0);
      const averageRating = stats.reviews > 0 ? stats.total_rating / stats.reviews : 0;

      return {
        user_id: userId,
        username: profile.username || null,
        display_name: profile.display_name || null,
        avatar_url: profile.avatar_url || null,
        is_top_reviewer: profile.is_top_reviewer || false,
        reviews: stats.reviews,
        helpful_votes_received: helpfulVotesReceived,
        average_rating: averageRating,
      };
    });

    // Sort based on sortBy parameter
    switch (sortBy) {
      case 'helpful_votes':
        leaderboardData.sort((a, b) => {
          if (b.helpful_votes_received !== a.helpful_votes_received) {
            return b.helpful_votes_received - a.helpful_votes_received;
          }
          return b.reviews - a.reviews;
        });
        break;
      case 'rating':
        leaderboardData.sort((a, b) => {
          if (b.average_rating !== a.average_rating) {
            return b.average_rating - a.average_rating;
          }
          return b.reviews - a.reviews;
        });
        break;
      case 'reviews':
      default:
        leaderboardData.sort((a, b) => {
          if (b.reviews !== a.reviews) {
            return b.reviews - a.reviews;
          }
          return b.helpful_votes_received - a.helpful_votes_received;
        });
        break;
    }

    // Apply limit
    const limitedData = leaderboardData.slice(0, limit);

    // Format response to match LeaderboardUser interface
    const formattedLeaderboard = limitedData.map((user, index) => {
      const displayName = user.display_name || user.username || 'Anonymous';
      const avatar = user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150';
      
      // Assign badges for top 3
      let badge: string | undefined;
      if (index === 0) badge = '🥇';
      else if (index === 1) badge = '🥈';
      else if (index === 2) badge = '🥉';

      return {
        rank: index + 1,
        id: user.user_id,
        username: displayName,
        reviews: user.reviews,
        badge,
        avatar,
        totalRating: parseFloat(user.average_rating.toFixed(1)),
        helpfulVotes: user.helpful_votes_received,
      };
    });

    return NextResponse.json({
      leaderboard: formattedLeaderboard,
      count: formattedLeaderboard.length,
      sortBy,
    });
  } catch (error: any) {
    console.error('[Leaderboard API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}

