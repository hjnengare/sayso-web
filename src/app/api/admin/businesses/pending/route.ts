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

    return NextResponse.json({ businesses: businesses ?? [] });
  } catch (error) {
    console.error('[Admin] Error in pending businesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
