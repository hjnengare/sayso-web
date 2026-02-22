import { NextRequest, NextResponse } from "next/server";
import { withUser } from '@/app/api/_lib/withAuth';

export const GET = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { count: reviewsCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    let helpfulVotesReceived = userStats?.helpful_votes_received || 0;
    if (helpfulVotesReceived === 0 && (!userStats || userStats.helpful_votes_received === 0)) {
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

    let savedBusinesses = userStats?.total_businesses_saved || 0;
    if (!savedBusinesses) {
      const { count: savedCount } = await supabase
        .from('saved_businesses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      savedBusinesses = savedCount || 0;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_top_reviewer, created_at')
      .eq('user_id', user.id)
      .single();

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

    const achievements: Array<{
      name: string;
      description: string;
      icon: string;
      earnedAt: string | null;
    }> = [];

    if (totalReviews >= 100) {
      achievements.push({
        name: "Century Club",
        description: "Posted 100 reviews",
        icon: "/badges/048-award.png",
        earnedAt: firstReviewDate || accountCreatedAt,
      });
    }
    if (totalReviews >= 50) {
      achievements.push({
        name: "Review Machine",
        description: "Posted 50 reviews",
        icon: "/badges/044-rocket.png",
        earnedAt: firstReviewDate || accountCreatedAt,
      });
    }
    if (totalReviews >= 10) {
      achievements.push({
        name: "Level Up!",
        description: "Posted 10 reviews",
        icon: "/badges/041-speedometer.png",
        earnedAt: firstReviewDate || accountCreatedAt,
      });
    }
    if (totalReviews >= 5) {
      achievements.push({
        name: "Rookie Reviewer",
        description: "Posted 5 reviews",
        icon: "/badges/030-badge.png",
        earnedAt: firstReviewDate || accountCreatedAt,
      });
    }
    if (firstReviewDate && totalReviews >= 1) {
      achievements.push({
        name: "New Voice",
        description: "Posted your first review",
        icon: "/badges/027-megaphone.png",
        earnedAt: firstReviewDate,
      });
    }
    if (helpfulVotes >= 10) {
      achievements.push({
        name: "Helpful Honeybee",
        description: "10 helpful likes",
        icon: "/badges/021-like.png",
        earnedAt: accountCreatedAt,
      });
    }
    if (isTopReviewer) {
      achievements.push({
        name: "Top Reviewer",
        description: "Among the top reviewers this month",
        icon: "/badges/011-compass.png",
        earnedAt: accountCreatedAt,
      });
    }

    achievements.sort((a, b) => {
      if (!a.earnedAt) return 1;
      if (!b.earnedAt) return -1;
      return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
    });

    return NextResponse.json({ data: achievements, success: true });
  } catch (error: any) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements', details: error.message },
      { status: 500 }
    );
  }
});
