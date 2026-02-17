import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';

/**
 * POST /api/badges/check-and-award
 * Checks user's eligibility for badges and awards any newly earned badges
 *
 * This should be called after:
 * - Review created/updated
 * - Photo uploaded
 * - Helpful vote received
 * - Daily cron (for streaks)
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call check_user_badges RPC which checks all badges and awards new ones
    // Returns a table of newly awarded badges (awarded_badge_id, badge_name)
    const { data: awardedBadges, error: checkError } = await supabase.rpc(
      'check_user_badges',
      { p_user_id: user.id }
    );

    if (checkError) {
      console.error('[Badge Check] Error checking badges:', checkError);
      return NextResponse.json({ error: 'Failed to check badges' }, { status: 500 });
    }

    // If no new badges were awarded
    if (!awardedBadges || awardedBadges.length === 0) {
      console.log(`[Badge Check] User ${user.id} earned 0 new badges: []`);
      return NextResponse.json({
        ok: true,
        message: 'No new badges earned',
        newBadges: []
      });
    }

    // Fetch full badge details for the newly awarded badges
    const awardedBadgeIds = awardedBadges.map((b: any) => b.awarded_badge_id);
    const { data: badgeDetails, error: badgeError } = await supabase
      .from('badges')
      .select('*')
      .in('id', awardedBadgeIds);

    if (badgeError) {
      console.error('[Badge Check] Error fetching badge details:', badgeError);
      // Return what we have from the RPC call
      const simpleBadges = awardedBadges.map((b: any) => ({
        id: b.awarded_badge_id,
        name: b.badge_name
      }));
      return NextResponse.json({
        ok: true,
        newBadges: simpleBadges,
        message: `Congratulations! You earned ${simpleBadges.length} new badge(s)!`
      });
    }

    const newlyEarnedBadges = (badgeDetails ?? []).map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon_path: badge.icon_path,
      badge_group: badge.badge_group
    }));

    console.log(`[Badge Check] User ${user.id} earned ${newlyEarnedBadges.length} new badges:`,
      newlyEarnedBadges.map(b => b.name));

    // Create notifications for each newly earned badge
    for (const badge of newlyEarnedBadges) {
      try {
        await supabase.rpc('create_badge_notification', {
          p_user_id: user.id,
          p_badge_id: badge.id,
          p_badge_name: badge.name,
          p_badge_icon: badge.icon_path || '/badges/default-badge.png'
        });
      } catch (notifError) {
        // Log error but don't fail the request if notification creation fails
        console.error(`[Badge Check] Failed to create notification for badge ${badge.id}:`, notifError);
      }
    }

    return NextResponse.json({
      ok: true,
      newBadges: newlyEarnedBadges,
      message: newlyEarnedBadges.length > 0
        ? `Congratulations! You earned ${newlyEarnedBadges.length} new badge(s)!`
        : 'No new badges earned'
    });

  } catch (error: any) {
    console.error('[Badge Check] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check badges',
        message: error.message
      },
      { status: 500 }
    );
  }
}
