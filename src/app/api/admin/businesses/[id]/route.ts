import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/businesses/[id]
 * Fetch full business details for admin review (no status filter).
 * Requires admin role.
 */
export async function GET(
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

    const { data: business, error } = await (service as any)
      .from('businesses')
      .select(`
        id,
        name,
        description,
        primary_subcategory_slug,
        primary_subcategory_label,
        primary_category_slug,
        location,
        address,
        phone,
        email,
        website,
        image_url,
        uploaded_images,
        price_range,
        status,
        owner_id,
        created_at,
        updated_at,
        lat,
        lng,
        slug,
        is_chain,
        normalized_name
      `)
      .eq('id', businessId)
      .single();

    if (error || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    let ownerEmail: string | null = null;
    if (business.owner_id) {
      const { data: profile } = await service
        .from('profiles')
        .select('email')
        .eq('user_id', business.owner_id)
        .maybeSingle();
      const row = profile as { email?: string | null } | null;
      ownerEmail = row?.email ?? null;
    }

    return NextResponse.json({
      ...business,
      owner_email: ownerEmail,
    });
  } catch (err) {
    console.error('[Admin] Error fetching business for review:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
