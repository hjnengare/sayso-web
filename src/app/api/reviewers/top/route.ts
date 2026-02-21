import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBadgeMapping, getBadgePngPath } from '../../../lib/badgeMappings';
import { isTopContributor } from '../../../lib/topContributor';

/**
 * GET /api/reviewers/top?limit=12
 * Fetches top reviewers based on a contributor score (cold-start friendly).
 * PUBLIC ENDPOINT - Uses service role for unauthenticated access
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '12');

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[Top Reviewers] Missing Supabase credentials');
      return NextResponse.json({ ok: true, reviewers: [], total: 0, mode: 'stage1' });
    }

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

    const REVIEW_POOL_SIZE = 5000;
    const LONG_REVIEW_CHARS = 240;

    const { data: reviewRows, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, rating, content, created_at')
      .order('created_at', { ascending: false })
      .limit(REVIEW_POOL_SIZE);

    if (reviewError) {
      console.error('[Top Reviewers] Error fetching reviews:', reviewError);
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }

    const reviews = Array.isArray(reviewRows) ? reviewRows : [];
    if (reviews.length === 0) {
      return NextResponse.json({ ok: true, reviewers: [], total: 0, mode: 'stage1' });
    }

    const reviewIds: string[] = [];
    const userStats = new Map<string, { count: number; ratingSum: number; hasLong: boolean; hasPhoto: boolean; helpfulReceived: number }>();
    const reviewIdToUserId = new Map<string, string>();
    for (const r of reviews) {
      if (!r?.user_id) continue;
      if (r?.id) {
        reviewIds.push(r.id);
        reviewIdToUserId.set(r.id, r.user_id);
      }
      if (!userStats.has(r.user_id)) {
        userStats.set(r.user_id, { count: 0, ratingSum: 0, hasLong: false, hasPhoto: false, helpfulReceived: 0 });
      }
      const stats = userStats.get(r.user_id)!;
      stats.count += 1;
      stats.ratingSum += Number(r.rating || 0);
      const content = typeof r.content === 'string' ? r.content : '';
      if (content.trim().length > LONG_REVIEW_CHARS) stats.hasLong = true;
    }

    // Mark photo reviews
    if (reviewIds.length > 0) {
      const batchSize = 250;
      for (let i = 0; i < reviewIds.length; i += batchSize) {
        const batch = reviewIds.slice(i, i + batchSize);
        const { data: imageRows, error: imageError } = await supabase
          .from('review_images')
          .select('review_id')
          .in('review_id', batch);
        if (imageError) {
          // Non-fatal; some environments may not have this table
          console.warn('[Top Reviewers] Error fetching review_images:', imageError.message);
          break;
        }
        const reviewsWithImages = new Set((imageRows || []).map((x: any) => x.review_id).filter(Boolean));
        if (reviewsWithImages.size === 0) continue;
        for (const reviewId of reviewsWithImages) {
          const userId = reviewIdToUserId.get(reviewId);
          if (!userId) continue;
          const stats = userStats.get(userId);
          if (stats) stats.hasPhoto = true;
        }
      }
    }

    // Count helpful votes per user (for Top Contributor eligibility)
    if (reviewIds.length > 0) {
      const batchSize = 250;
      for (let i = 0; i < reviewIds.length; i += batchSize) {
        const batch = reviewIds.slice(i, i + batchSize);
        const { data: voteRows, error: voteError } = await supabase
          .from('review_helpful_votes')
          .select('review_id')
          .in('review_id', batch);
        if (voteError) {
          console.warn('[Top Reviewers] Error fetching helpful votes:', voteError.message);
          break;
        }
        for (const v of voteRows || []) {
          const userId = reviewIdToUserId.get(v.review_id);
          if (!userId) continue;
          const stats = userStats.get(userId);
          if (stats) stats.helpfulReceived += 1;
        }
      }
    }

    const userIds = Array.from(userStats.keys());
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url, is_top_reviewer, badges_count')
      .in('user_id', userIds);

    if (profileError) {
      console.warn('[Top Reviewers] Error fetching profiles:', profileError.message);
    }

    const profileById = new Map<string, any>();
    for (const p of profileRows || []) {
      if (p?.user_id) profileById.set(p.user_id, p);
    }

    // Batch-fetch earned badges for all reviewers (two queries to avoid PostgREST join issues)
    const badgesByUserId = new Map<string, Array<{ id: string; name: string; icon_path?: string; badge_group?: string }>>();
    try {
      // 1. Get user_id -> badge_id mappings
      const { data: userBadgeRows, error: ubError } = await supabase
        .from('user_badges')
        .select('user_id, badge_id')
        .in('user_id', userIds);

      if (ubError) {
        console.warn('[Top Reviewers] Error fetching user_badges:', ubError.message);
      } else if (userBadgeRows && userBadgeRows.length > 0) {
        // 2. Fetch badge definitions for all referenced badge IDs
        const badgeIds = [...new Set(userBadgeRows.map((r: any) => r.badge_id).filter(Boolean))];
        const { data: badgeRows, error: bError } = await supabase
          .from('badges')
          .select('id, name, icon_name, badge_group')
          .in('id', badgeIds);

        if (bError) {
          console.warn('[Top Reviewers] Error fetching badges:', bError.message);
        } else {
          // Build a lookup by badge ID
          const badgeLookup = new Map<string, any>();
          for (const b of badgeRows || []) {
            if (b?.id) badgeLookup.set(b.id, b);
          }

          // Map badges to each user
          for (const row of userBadgeRows as any[]) {
            if (!row?.user_id || !row?.badge_id) continue;
            const badge = badgeLookup.get(row.badge_id);
            if (!badge) continue;
            const mapping = getBadgeMapping(badge.id);
            const entry = {
              id: badge.id,
              name: mapping?.name || badge.name,
              icon_path: mapping?.pngPath || getBadgePngPath(badge.id),
              badge_group: badge.badge_group,
            };
            if (!badgesByUserId.has(row.user_id)) {
              badgesByUserId.set(row.user_id, []);
            }
            badgesByUserId.get(row.user_id)!.push(entry);
          }
        }
      }
    } catch (badgeErr) {
      console.warn('[Top Reviewers] Badge fetch failed (non-fatal):', badgeErr);
    }

    // Cold-start friendly contributor score:
    // - user has written >= 1 review: +3
    // - any review has photo: +2
    // - any review exceeds length threshold: +1
    // - user has any badge: +2
    const scored = userIds
      .map((userId) => {
        const stats = userStats.get(userId)!;
        const profile = profileById.get(userId) || {};
        const badgesCount = Number(profile.badges_count || 0);
        const hasBadge = badgesCount > 0 || Boolean(profile.is_top_reviewer);
        const score =
          (stats.count >= 1 ? 3 : 0) +
          (stats.hasPhoto ? 2 : 0) +
          (stats.hasLong ? 1 : 0) +
          (hasBadge ? 2 : 0);

        const avgRating = stats.count > 0 ? stats.ratingSum / stats.count : 0;
        const displayName = profile.display_name || profile.username || 'Anonymous';
        const avatarSeedName = profile.display_name || profile.username || 'User';

        return {
          id: userId,
          name: displayName,
          username: profile.username,
          profilePicture:
            profile.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarSeedName)}&background=random`,
          reviewCount: stats.count,
          avgRatingGiven: stats.count > 0 ? Math.round((stats.ratingSum / stats.count) * 10) / 10 : null,
          helpfulVotes: stats.helpfulReceived,
          rating: Math.round(avgRating * 10) / 10,
          badge: profile.is_top_reviewer ? ('top' as const) : undefined,
          badgesCount,
          badges: badgesByUserId.get(userId) || [],
          location: 'Cape Town',
          _score: score,
          _tie: Math.round(avgRating * 100) + stats.count * 10 + (stats.hasPhoto ? 1 : 0),
        };
      })
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
        if (b._tie !== a._tie) return b._tie - a._tie;
        return a.id.localeCompare(b.id);
      });

    // Filter to Top Contributors only (centralized eligibility check)
    const eligible = scored.filter((r) => {
      const stats = userStats.get(r.id);
      return isTopContributor(r.reviewCount, stats?.helpfulReceived ?? 0);
    });

    const reviewersWithRatings = eligible.slice(0, Math.max(0, limit)).map(({ _score, _tie, ...rest }) => rest);
    const uniqueContributors = userIds.length;
    const totalReviewsSeen = reviews.length;
    const mode = uniqueContributors < 25 || totalReviewsSeen < 200 ? 'stage1' : 'normal';

    return NextResponse.json({
      ok: true,
      reviewers: reviewersWithRatings,
      total: reviewersWithRatings.length,
      mode,
      meta: {
        poolSize: REVIEW_POOL_SIZE,
        uniqueContributors,
        totalReviewsSeen,
        scoring: {
          reviewWrittenPoints: 3,
          hasPhotoPoints: 2,
          hasLongReviewPoints: 1,
          hasBadgePoints: 2,
          longReviewChars: LONG_REVIEW_CHARS,
        },
      },
    });

  } catch (error: any) {
    console.error('[Top Reviewers] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top reviewers', message: error.message },
      { status: 500 }
    );
  }
}
