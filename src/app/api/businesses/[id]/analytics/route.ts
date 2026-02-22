import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

type ViewsRow = { viewed_at: string };
type ReviewRow = { created_at: string; rating: number | null; helpful_count: number };
type EventSpecialRow = { type: string };

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/businesses/[id]/analytics
 * Returns time-series and aggregate stats for the business dashboard.
 * Owner-only (same check as views API).
 */
export const GET = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: businessId } = await (params as RouteContext['params']);

    if (!businessId || businessId.trim() === '') {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    if (!business || business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(MAX_DAYS, Math.max(1, parseInt(searchParams.get('days') || String(DEFAULT_DAYS), 10)));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = toDateKey(since);

    // Build last N days for filling gaps
    const dateLabels: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateLabels.push(toDateKey(d));
    }

    // 1) Views over time (by day)
    const { data: viewsData } = await supabase
      .from('business_profile_views')
      .select('viewed_at')
      .eq('business_id', businessId)
      .gte('viewed_at', sinceStr);

    const viewsByDay: Record<string, number> = {};
    dateLabels.forEach(d => { viewsByDay[d] = 0; });
    (viewsData as ViewsRow[] || []).forEach(row => {
      const key = row.viewed_at?.toString().split('T')[0] || '';
      if (viewsByDay[key] !== undefined) viewsByDay[key]++;
    });
    const viewsOverTime = dateLabels.map(date => ({
      date,
      views: viewsByDay[date] ?? 0,
    }));

    // 2) Reviews over time (by day) and 3) Rating trend (rolling avg by day)
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('created_at, rating, helpful_count')
      .eq('business_id', businessId)
      .gte('created_at', since.toISOString());

    const reviewsByDay: Record<string, number> = {};
    const ratingByDay: Record<string, { sum: number; count: number }> = {};
    dateLabels.forEach(d => {
      reviewsByDay[d] = 0;
      ratingByDay[d] = { sum: 0, count: 0 };
    });

    let totalHelpfulVotes = 0;
    (reviewsData as ReviewRow[] || []).forEach(row => {
      const key = row.created_at?.toString().split('T')[0] || '';
      if (reviewsByDay[key] !== undefined) {
        reviewsByDay[key]++;
      }
      if (ratingByDay[key]) {
        const r = row.rating != null ? Number(row.rating) : 0;
        if (r > 0) {
          ratingByDay[key].sum += r;
          ratingByDay[key].count++;
        }
      }
      totalHelpfulVotes += Number(row.helpful_count) || 0;
    });

    const reviewsOverTime = dateLabels.map(date => ({
      date,
      count: reviewsByDay[date] ?? 0,
    }));

    const ratingTrend = dateLabels.map(date => {
      const r = ratingByDay[date];
      const avg = r && r.count > 0 ? r.sum / r.count : null;
      return { date, avgRating: avg };
    });

    // 4) Events & Specials counts (this business, any time)
    const { data: eventsSpecialsData } = await supabase
      .from('events_and_specials')
      .select('type')
      .eq('business_id', businessId);

    let eventsCount = 0;
    let specialsCount = 0;
    (eventsSpecialsData as EventSpecialRow[] || []).forEach(row => {
      if (row.type === 'event') eventsCount++;
      else if (row.type === 'special') specialsCount++;
    });

    return NextResponse.json({
      viewsOverTime,
      reviewsOverTime,
      ratingTrend,
      totalHelpfulVotes,
      eventsCount,
      specialsCount,
      totalViews: viewsOverTime.reduce((a, b) => a + b.views, 0),
      totalReviews: reviewsOverTime.reduce((a, b) => a + b.count, 0),
    });
  } catch (error) {
    console.error('Error in business analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
