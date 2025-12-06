import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch user stats (which includes cached counts)
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch reviews count
    const { count: reviewsCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Use helpful votes from stats if available, otherwise calculate
    let helpfulVotesReceived = userStats?.helpful_votes_received || 0;
    if (helpfulVotesReceived === 0 && (!userStats || userStats.helpful_votes_received === 0)) {
      // Calculate helpful votes received if not in stats
      const { data: userReviews } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id);
      
      const reviewIds = userReviews?.map(r => r.id) || [];
      if (reviewIds.length > 0) {
        const { count } = await supabase
          .from('review_helpful_votes')
          .select('*', { count: 'exact', head: true })
          .in('review_id', reviewIds);
        helpfulVotesReceived = count || 0;
      }
    }

    // Use saved businesses from stats if available, otherwise calculate
    let savedBusinesses = userStats?.total_businesses_saved || 0;
    if (!savedBusinesses) {
      const { count: savedCount } = await supabase
        .from('saved_businesses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      savedBusinesses = savedCount || 0;
    }

    // Fetch profile to check if user is top reviewer
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_top_reviewer, created_at')
      .eq('user_id', user.id)
      .single();

    // Fetch first review date
    const { data: firstReview } = await supabase
      .from('reviews')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const totalReviews = reviewsCount || 0;
    const helpfulVotes = helpfulVotesReceived;
    const isTopReviewer = profile?.is_top_reviewer || false;
    const accountCreatedAt = profile?.created_at || user.created_at;
    const firstReviewDate = firstReview?.created_at;

    // Compute achievements based on stats
    const achievements: Array<{
      name: string;
      description: string;
      icon: string;
      earnedAt: string | null;
    }> = [];

    // First Review Achievement
    if (firstReviewDate) {
      achievements.push({
        name: "First Review",
        description: "Posted your first review",
        icon: "⭐",
        earnedAt: firstReviewDate,
      });
    }

    // Review Milestones
    if (totalReviews >= 100) {
      achievements.push({
        name: "Century Club",
        description: "Posted 100 reviews",
        icon: "💯",
        earnedAt: firstReviewDate || accountCreatedAt,
      });
    } else if (totalReviews >= 50) {
      achievements.push({
        name: "Half Century",
        description: "Posted 50 reviews",
        icon: "🎯",
        earnedAt: firstReviewDate || accountCreatedAt,
      });
    } else if (totalReviews >= 25) {
      achievements.push({
        name: "Quarter Century",
        description: "Posted 25 reviews",
        icon: "📝",
        earnedAt: firstReviewDate || accountCreatedAt,
      });
    } else if (totalReviews >= 10) {
      achievements.push({
        name: "Decade Reviewer",
        description: "Posted 10 reviews",
        icon: "🔟",
        earnedAt: firstReviewDate || accountCreatedAt,
      });
    } else if (totalReviews >= 5) {
      achievements.push({
        name: "Getting Started",
        description: "Posted 5 reviews",
        icon: "🌟",
        earnedAt: firstReviewDate || accountCreatedAt,
      });
    }

    // Helpful Votes Achievements
    if (helpfulVotes >= 500) {
      achievements.push({
        name: "Helpful Hero",
        description: "Received 500+ helpful votes",
        icon: "👑",
        earnedAt: accountCreatedAt,
      });
    } else if (helpfulVotes >= 100) {
      achievements.push({
        name: "Helpful Contributor",
        description: "Received 100+ helpful votes",
        icon: "👍",
        earnedAt: accountCreatedAt,
      });
    } else if (helpfulVotes >= 50) {
      achievements.push({
        name: "Community Helper",
        description: "Received 50+ helpful votes",
        icon: "💚",
        earnedAt: accountCreatedAt,
      });
    } else if (helpfulVotes >= 10) {
      achievements.push({
        name: "Helpful Starter",
        description: "Received 10+ helpful votes",
        icon: "✨",
        earnedAt: accountCreatedAt,
      });
    }

    // Saved Businesses Achievements
    if (savedBusinesses >= 50) {
      achievements.push({
        name: "Curator",
        description: "Saved 50+ businesses",
        icon: "📚",
        earnedAt: accountCreatedAt,
      });
    } else if (savedBusinesses >= 25) {
      achievements.push({
        name: "Collector",
        description: "Saved 25+ businesses",
        icon: "📖",
        earnedAt: accountCreatedAt,
      });
    } else if (savedBusinesses >= 10) {
      achievements.push({
        name: "Bookmarker",
        description: "Saved 10+ businesses",
        icon: "🔖",
        earnedAt: accountCreatedAt,
      });
    }

    // Top Reviewer Achievement
    if (isTopReviewer) {
      achievements.push({
        name: "Top Reviewer",
        description: "Among the top reviewers this month",
        icon: "🏆",
        earnedAt: accountCreatedAt,
      });
    }

    // Sort achievements by earned date (most recent first)
    achievements.sort((a, b) => {
      if (!a.earnedAt) return 1;
      if (!b.earnedAt) return -1;
      return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
    });

    return NextResponse.json({
      data: achievements,
      success: true,
    });
  } catch (error: any) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements', details: error.message },
      { status: 500 }
    );
  }
}

