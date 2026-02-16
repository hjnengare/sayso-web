import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';
import { invalidateBusinessCache } from '@/app/lib/utils/optimizedQueries';

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

    const { data: business, error: fetchError } = await (service as any)
      .from('businesses')
      .select('id, status, owner_id, name, slug, primary_subcategory_slug, primary_category_slug, location, address, lat, lng')
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

    const biz = business as {
      status?: string;
      owner_id?: string | null;
      name?: string | null;
      primary_subcategory_slug?: string | null;
      primary_category_slug?: string | null;
      location?: string | null;
      address?: string | null;
      lat?: number | null;
      lng?: number | null;
    };
    if (biz.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Business is not pending approval' },
        { status: 400 }
      );
    }

    // Final validation: required fields
    const hasName = typeof biz.name === 'string' && biz.name.trim().length > 0;
    const hasCategory = Boolean(biz.primary_subcategory_slug || biz.primary_category_slug);
    const hasAddress = Boolean(
      (typeof biz.address === 'string' && biz.address.trim()) ||
        (typeof biz.location === 'string' && biz.location.trim())
    );
    const hasLat = biz.lat != null && !Number.isNaN(biz.lat);
    const hasLng = biz.lng != null && !Number.isNaN(biz.lng);
    if (!hasName || !hasCategory || !hasAddress || !hasLat || !hasLng) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Missing required fields. Business must have name, category, address, and coordinates (latitude, longitude).',
        },
        { status: 400 }
      );
    }

    if (biz.owner_id && biz.owner_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot approve your own business' },
        { status: 403 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      status: 'active',
      is_hidden: false,
      verified: true,
      updated_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejection_reason: null,
    };

    const { error: updateError } = await (service as any)
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

    // Invalidate caches and revalidate home + category pages
    try {
      invalidateBusinessCache(businessId, (business as { slug?: string | null })?.slug ?? undefined);
    } catch (cacheErr) {
      console.warn('[Admin] Cache invalidation:', cacheErr);
    }
    revalidatePath('/');
    revalidatePath('/home');
    revalidatePath('/for-you');

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
