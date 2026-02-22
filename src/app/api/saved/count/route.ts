import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

/**
 * GET /api/saved/count
 * Get counts of all saved items for the current user
 */
export const GET = withUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    const [businessesResult, eventsResult, specialsResult] = await Promise.all([
      supabase.from('saved_businesses').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('saved_events').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('saved_specials').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    if (businessesResult.error) console.error('[Saved Count API] Error fetching businesses count:', businessesResult.error);
    if (eventsResult.error) console.error('[Saved Count API] Error fetching events count:', eventsResult.error);
    if (specialsResult.error) console.error('[Saved Count API] Error fetching specials count:', specialsResult.error);

    const businesses = businessesResult.count || 0;
    const events = eventsResult.count || 0;
    const specials = specialsResult.count || 0;
    const total = businesses + events + specials;

    return NextResponse.json({ success: true, businesses, events, specials, total });
  } catch (error) {
    console.error('[Saved Count API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
