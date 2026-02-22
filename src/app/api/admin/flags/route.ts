import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/flags?status=pending&limit=50&offset=0
 * Returns flagged reviews with reviewer info for admin moderation.
 */
export const GET = withAdmin(async (
  req: NextRequest,
  { supabase }
) => {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') || 'pending';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Fetch flags joined with review content and reporter profile
  const { data: flags, error, count } = await supabase
    .from('review_flags')
    .select(`
      id,
      reason,
      details,
      status,
      admin_notes,
      created_at,
      reviewed_at,
      review_id,
      flagged_by,
      reviews (
        id,
        content,
        rating,
        title,
        created_at,
        business_id,
        user_id,
        businesses ( id, name, slug )
      ),
      profiles!flagged_by (
        id,
        display_name,
        username,
        avatar_url
      )
    `, { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Admin flags fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch flags' }, { status: 500 });
  }

  // Also fetch flag counts per review (to show how many times a review has been flagged)
  const reviewIds = [...new Set((flags ?? []).map((f) => f.review_id))];
  let flagCounts: Record<string, number> = {};
  if (reviewIds.length > 0) {
    const { data: counts } = await supabase
      .from('review_flags')
      .select('review_id')
      .in('review_id', reviewIds)
      .eq('status', 'pending');
    if (counts) {
      flagCounts = counts.reduce<Record<string, number>>((acc, row) => {
        acc[row.review_id] = (acc[row.review_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  const enriched = (flags ?? []).map((f) => ({
    ...f,
    total_flags_on_review: flagCounts[f.review_id] ?? 1,
  }));

  return NextResponse.json({ flags: enriched, total: count ?? 0 });
});
