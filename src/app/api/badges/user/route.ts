import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBadgeMapping, getBadgePngPath } from '../../../lib/badgeMappings';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/badges/user?user_id=xxx
 * Fetches all badges for a user (earned and unearned)
 * Returns PNG paths from badge mappings for consistent display
 * 
 * PUBLIC ENDPOINT - Uses service role key to allow unauthenticated access
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    // Validate UUID format to prevent Postgres errors
    if (!UUID_REGEX.test(userId)) {
      console.log(`[Badge Fetch] Invalid UUID format: ${userId}`);
      // Return empty badges gracefully instead of 500
      return NextResponse.json({
        ok: true,
        badges: [],
        grouped: {
          explorer: [],
          specialist: [],
          milestone: [],
          community: []
        },
        stats: {
          total: 0,
          earned: 0,
          percentage: 0
        }
      });
    }

    // Use service role client for public badge queries (bypasses RLS)
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

    // Fetch all badges with user's earned status
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('badge_group', { ascending: true });

    if (badgesError) {
      console.error('[Badge Fetch] Error fetching badges:', badgesError);
      // Return empty badges gracefully instead of 500
      return NextResponse.json({
        ok: true,
        badges: [],
        grouped: {
          explorer: [],
          specialist: [],
          milestone: [],
          community: []
        },
        stats: {
          total: 0,
          earned: 0,
          percentage: 0
        }
      });
    }

    // Fetch user's earned badges
    const { data: earnedBadges, error: earnedError } = await supabase
      .from('user_badges')
      .select('badge_id, awarded_at')
      .eq('user_id', userId);

    if (earnedError) {
      console.error('[Badge Fetch] Error fetching earned badges:', earnedError);
      // Continue without earned badges rather than failing
      // This allows the endpoint to still show all available badges
    }

    // Create a set of earned badge IDs for quick lookup
    const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) || []);
    const earnedBadgeMap = new Map(
      earnedBadges?.map(b => [b.badge_id, b.awarded_at]) || []
    );

    // Combine data with PNG paths from mappings
    const badgesWithStatus = allBadges?.map(badge => {
      const mapping = getBadgeMapping(badge.id);
      return {
        ...badge,
        // Use mapping name/description if available (updated spec names)
        name: mapping?.name || badge.name,
        description: mapping?.description || badge.description,
        // Add PNG path from mappings
        icon_path: mapping?.pngPath || getBadgePngPath(badge.id),
        earned: earnedBadgeIds.has(badge.id),
        awarded_at: earnedBadgeMap.get(badge.id) || null
      };
    }) || [];

    // Group by badge_group
    const grouped = {
      explorer: badgesWithStatus.filter(b => b.badge_group === 'explorer' || b.badge_group === 'category_explorer'),
      specialist: badgesWithStatus.filter(b => b.badge_group === 'specialist' || b.badge_group === 'category_specialist'),
      milestone: badgesWithStatus.filter(b => b.badge_group === 'milestone'),
      community: badgesWithStatus.filter(b => b.badge_group === 'community' || b.badge_group === 'personality')
    };

    // Calculate stats
    const stats = {
      total: allBadges?.length || 0,
      earned: earnedBadgeIds.size,
      percentage: allBadges?.length
        ? Math.round((earnedBadgeIds.size / allBadges.length) * 100)
        : 0
    };

    return NextResponse.json({
      ok: true,
      badges: badgesWithStatus,
      grouped,
      stats
    });

  } catch (error: any) {
    console.error('[Badge Fetch] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user badges',
        message: error.message
      },
      { status: 500 }
    );
  }
}
