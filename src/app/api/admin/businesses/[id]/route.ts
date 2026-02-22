import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/businesses/[id]
 * Fetch full business details for admin review (no status filter).
 * Requires admin role.
 */
export const GET = withAdmin(async (req, { service, params }) => {
  try {
    const businessId = (await params).id;
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

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
      .maybeSingle();

    if (error) {
      console.error('[Admin] Business query error:', error);
      return NextResponse.json({ error: 'Business not found', details: error.message }, { status: 404 });
    }
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Fetch uploaded images from business_images table
    const { data: imageRows } = await (service as any)
      .from('business_images')
      .select('url, is_primary, sort_order')
      .eq('business_id', businessId);
    const sortedImages = (imageRows || [])
      .slice()
      .sort((a: any, b: any) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });
    const uploadedImages = sortedImages.map((r: any) => r.url).filter(Boolean);

    let ownerEmail: string | null = null;
    if (business.owner_id) {
      const { data: profile } = await (service as any)
        .from('profiles')
        .select('email')
        .eq('user_id', business.owner_id)
        .maybeSingle();
      const row = profile as { email?: string | null } | null;
      ownerEmail = row?.email ?? null;
    }

    return NextResponse.json({
      ...business,
      uploaded_images: uploadedImages,
      owner_email: ownerEmail,
    });
  } catch (err) {
    console.error('[Admin] Error fetching business for review:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
