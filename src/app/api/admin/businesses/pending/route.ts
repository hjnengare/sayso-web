import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/businesses/pending
 * List businesses with status = 'pending_approval' for admin review.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const service = getServiceSupabase();

    const { data: businesses, error } = await service
      .from('businesses')
      .select('id, name, slug, location, primary_subcategory_label, created_at, owner_id')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin] Error fetching pending businesses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pending businesses', details: error.message },
        { status: 500 }
      );
    }

    type PendingRow = { id: string; name: string | null; slug: string | null; location: string | null; primary_subcategory_label: string | null; created_at: string; owner_id: string | null };
    const rows: PendingRow[] = (businesses ?? []) as PendingRow[];
    const ownerIds = [...new Set(rows.map((b) => b.owner_id).filter(Boolean))] as string[];
    let ownerEmailMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profiles } = await service
        .from('profiles')
        .select('user_id, email')
        .in('user_id', ownerIds);
      ownerEmailMap = new Map(
        (profiles ?? []).map((p: { user_id: string; email: string | null }) => [p.user_id, p.email ?? '—'])
      );
    }

    const enriched = rows.map((b) => ({
      ...b,
      owner_email: b.owner_id ? ownerEmailMap.get(b.owner_id) ?? '—' : '—',
    }));

    return NextResponse.json({ businesses: enriched });
  } catch (error) {
    console.error('[Admin] Error in pending businesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
