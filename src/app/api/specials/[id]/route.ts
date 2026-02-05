import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/specials/[id]
 * Fetch a single special by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.trim() === '') {
      return NextResponse.json(
        { error: 'Special ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase(req);

    // Fetch the special with business info
    type Business = {
      id: string;
      name: string;
      slug?: string;
      image_url?: string;
      address?: string;
      phone?: string;
      website?: string;
      email?: string;
    };

    type Special = {
      id: string;
      title: string;
      type: string;
      description?: string;
      start_date: string;
      end_date?: string;
      location?: string;
      icon?: string;
      image?: string;
      price?: number;
      rating?: number;
      booking_url?: string;
      booking_contact?: string;
      business_id: string;
      created_by?: string;
      created_at?: string;
      updated_at?: string;
      businesses?: Business | Business[];
    };

    const { data: specialRaw, error } = await supabase
      .from('events_and_specials')
      .select(`
        id,
        title,
        type,
        description,
        start_date,
        end_date,
        location,
        icon,
        image,
        price,
        rating,
        booking_url,
        booking_contact,
        business_id,
        created_by,
        created_at,
        updated_at,
        businesses:business_id (
          id,
          name,
          slug,
          image_url,
          address,
          phone,
          website,
          email
        )
      `)
      .eq('id', id)
      .eq('type', 'special')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          { error: 'Special not found' },
          { status: 404 }
        );
      }
      console.error('[Specials API] Error fetching special:', error);
      return NextResponse.json(
        { error: 'Failed to fetch special', details: error.message },
        { status: 500 }
      );
    }

    const special = specialRaw as Special;
    if (!special) {
      return NextResponse.json(
        { error: 'Special not found' },
        { status: 404 }
      );
    }

    // Check if special is expired
    const now = new Date();
    const endDate = special.end_date ? new Date(special.end_date) : null;
    const startDate = new Date(special.start_date);

    // A special is expired if:
    // - end_date exists and is in the past, OR
    // - no end_date and start_date is in the past
    const isExpired = endDate
      ? endDate < now
      : startDate < now;

    // Transform to frontend format
    const transformedSpecial = {
      id: special.id,
      title: special.title,
      type: 'special' as const,
      image: special.image || null,
      alt: `${special.title} special`,
      icon: special.icon,
      location: special.location || 'Location TBA',
      rating: special.rating || 0,
      startDate: special.start_date ? new Date(special.start_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) : 'TBA',
      endDate: special.end_date ? new Date(special.end_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) : undefined,
      startDateISO: special.start_date,
      endDateISO: special.end_date,
      price: special.price ? `R${special.price}` : null,
      description: special.description || null,
      bookingUrl: special.booking_url,
      bookingContact: special.booking_contact,
      businessId: special.business_id,
      businessName: (special.businesses && !Array.isArray(special.businesses)) ? special.businesses.name || 'Unknown Business'
        : Array.isArray(special.businesses) ? special.businesses[0]?.name || 'Unknown Business'
        : 'Unknown Business',
      businessSlug: (special.businesses && !Array.isArray(special.businesses)) ? special.businesses.slug
        : Array.isArray(special.businesses) ? special.businesses[0]?.slug
        : undefined,
      businessLogo: (special.businesses && !Array.isArray(special.businesses)) ? special.businesses.image_url
        : Array.isArray(special.businesses) ? special.businesses[0]?.image_url
        : undefined,
      businessAddress: (special.businesses && !Array.isArray(special.businesses)) ? special.businesses.address
        : Array.isArray(special.businesses) ? special.businesses[0]?.address
        : undefined,
      businessPhone: (special.businesses && !Array.isArray(special.businesses)) ? special.businesses.phone
        : Array.isArray(special.businesses) ? special.businesses[0]?.phone
        : undefined,
      businessWebsite: (special.businesses && !Array.isArray(special.businesses)) ? special.businesses.website
        : Array.isArray(special.businesses) ? special.businesses[0]?.website
        : undefined,
      businessEmail: (special.businesses && !Array.isArray(special.businesses)) ? special.businesses.email
        : Array.isArray(special.businesses) ? special.businesses[0]?.email
        : undefined,
      createdBy: special.created_by,
      createdAt: special.created_at,
      updatedAt: special.updated_at,
      isBusinessOwned: true,
      isExpired,
      source: 'business',
      href: `/special/${special.id}`,
    };

    return NextResponse.json({
      special: transformedSpecial,
      isExpired,
    });
  } catch (error: any) {
    console.error('[Specials API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}
