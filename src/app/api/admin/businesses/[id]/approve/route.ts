import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';
import type { Database } from '@/app/types/supabase';

type BusinessesUpdate = Database['public']['Tables']['businesses']['Update'];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/businesses/[id]/approve
 * Approve a pending business so it becomes publicly visible.
 * Requires admin. Sets status = 'active'.
 * Optional: if DB has approved_at, approved_by columns they can be set via migration.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const businessId = (await params).id;
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const service = getServiceSupabase();

    const { data: business, error: fetchError } = await service
      .from('businesses')
      .select('id, status')
      .eq('id', businessId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Admin] Error fetching business for approval:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch business', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if ((business as { status?: string }).status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Business is not pending approval' },
        { status: 400 }
      );
    }

    const updatePayload: BusinessesUpdate = {
      status: 'active',
      updated_at: new Date().toISOString(),
    };
    // Optional: set when DB has these columns (add migration if needed)
    // updatePayload.approved_at = new Date().toISOString();
    // updatePayload.approved_by = user.id;

    const { error: updateError } = await service
      .from('businesses')
      .update(updatePayload)
      .eq('id', businessId);

    if (updateError) {
      console.error('[Admin] Error approving business:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve business', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Business approved and now visible publicly',
      business_id: businessId,
    });
  } catch (error) {
    console.error('[Admin] Error in approve business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
