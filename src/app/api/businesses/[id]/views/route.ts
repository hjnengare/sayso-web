import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/businesses/[id]/views
 * Record a profile view (authenticated, deduplicated per day, skips owner)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Silently skip for unauthenticated users
    if (authError || !user) {
      return NextResponse.json({ recorded: false }, { status: 200 });
    }

    // Check if viewer is the business owner (skip recording)
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    if (business?.owner_id === user.id) {
      return NextResponse.json({ recorded: false }, { status: 200 });
    }

    // Insert view (ON CONFLICT DO NOTHING handles daily dedup)
    const { error: insertError } = await supabase
      .from('business_profile_views')
      .insert({
        business_id: businessId,
        viewer_id: user.id,
      });

    // 23505 = unique_violation (already viewed today) — not an error
    if (insertError && insertError.code !== '23505') {
      console.error('Error recording profile view:', insertError);
      return NextResponse.json({ recorded: false }, { status: 200 });
    }

    return NextResponse.json({ recorded: true }, { status: 200 });
  } catch (error) {
    // Fire-and-forget — never fail the page load
    console.error('Error in record view API:', error);
    return NextResponse.json({ recorded: false }, { status: 200 });
  }
}

/**
 * GET /api/businesses/[id]/views
 * Get profile view count for the last N days (default 30)
 * Only accessible by the business owner
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller owns the business
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    if (!business || business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse days param (default 30)
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { count, error: countError } = await supabase
      .from('business_profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('viewed_at', sinceDate.toISOString().split('T')[0]);

    if (countError) {
      console.error('Error fetching view count:', countError);
      return NextResponse.json({ error: 'Failed to fetch view count' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in get views API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
