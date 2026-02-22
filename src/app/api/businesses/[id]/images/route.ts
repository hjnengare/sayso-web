import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/businesses/[id]/images
 * Fetch all images for a business from business_images table
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const supabase = await getServerSupabase(req);

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Fetch images from business_images table, ordered by primary first, then sort_order
    const { data: images, error } = await supabase
      .from('business_images')
      .select('id, url, type, sort_order, is_primary, created_at')
      .eq('business_id', businessId)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[API] Error fetching business images:', error);
      return NextResponse.json(
        { error: 'Failed to fetch business images', details: error.message },
        { status: 500 }
      );
    }

    // Return images as array
    return NextResponse.json({ images: images || [] });
  } catch (error: any) {
    console.error('[API] Error in GET business images:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/businesses/[id]/images
 * Add images to a business (requires business owner authentication)
 * Inserts records into business_images table
 */
export const POST = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: businessId } = await (params as RouteContext['params']);

    if (!businessId || businessId.trim() === '') {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('[API] Business fetch error:', businessError);
      return NextResponse.json(
        { error: 'Business not found', details: businessError?.message || 'Business does not exist', code: 'BUSINESS_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check ownership
    const { data: ownerCheck } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    const isOwner = ownerCheck || business.owner_id === user.id;

    if (!isOwner) {
      console.error('[API] Permission denied:', { userId: user.id, businessId, ownerId: business.owner_id });
      return NextResponse.json(
        { error: 'You do not have permission to add images to this business', details: 'User is not the owner of this business', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { images } = body; // Array of { url } objects or strings

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Images array is required' },
        { status: 400 }
      );
    }

    // Extract URLs from images array
    const newUrls = images.map((img: any) => {
      if (typeof img === 'string') {
        return img;
      }
      return img.url;
    }).filter((url: string) => url && typeof url === 'string');

    if (newUrls.length === 0) {
      return NextResponse.json(
        { error: 'Valid image URLs are required' },
        { status: 400 }
      );
    }

    // Get current image count from business_images table
    const { count: currentCount, error: countError } = await supabase
      .from('business_images')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    if (countError) {
      console.error('[API] Error counting existing images:', countError);
      return NextResponse.json(
        { error: 'Failed to check current image count', details: countError.message },
        { status: 500 }
      );
    }

    // Check image limit (max 10 images per business)
    const MAX_IMAGES = 10;
    const existingCount = currentCount || 0;
    const newCount = newUrls.length;
    
    if (existingCount + newCount > MAX_IMAGES) {
      const remainingSlots = MAX_IMAGES - existingCount;
      if (remainingSlots <= 0) {
        return NextResponse.json(
          { error: `Maximum image limit reached (${MAX_IMAGES} images). Please delete some images before adding new ones.` },
          { status: 400 }
        );
      }
      // Truncate to fit within limit
      newUrls.splice(remainingSlots);
      return NextResponse.json(
        { 
          error: `Only ${remainingSlots} image(s) can be added. Maximum limit is ${MAX_IMAGES} images.`,
          warning: true,
          max_images: MAX_IMAGES,
          current_count: existingCount,
          attempted_count: newCount,
          remaining_slots: remainingSlots
        },
        { status: 400 }
      );
    }

    // Check if business already has a primary image
    const { data: existingPrimary } = await supabase
      .from('business_images')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_primary', true)
      .limit(1)
      .single();

    // Prepare image records to insert
    // All new images are gallery type unless no primary exists (first becomes primary)
    const imageRecords = newUrls.map((url, index) => {
      // First image becomes primary only if no primary exists
      const shouldBePrimary = index === 0 && !existingPrimary;
      return {
        business_id: businessId,
        url: url,
        type: shouldBePrimary ? 'cover' : 'gallery',
        sort_order: existingCount + index, // Continue sort_order from existing images
        is_primary: shouldBePrimary,
      };
    });

    // Insert new image records
    const { data: insertedImages, error: insertError } = await supabase
      .from('business_images')
      .insert(imageRecords)
      .select('id, url, type, sort_order, is_primary, created_at');

    if (insertError) {
      console.error('[API] Error inserting images:', insertError);
      return NextResponse.json(
        { 
          error: 'Failed to add images', 
          details: insertError.message || 'Database error occurred',
          code: insertError.code 
        },
        { status: 500 }
      );
    }

    // Return the inserted images
    return NextResponse.json({
      success: true,
      images: insertedImages || [],
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Unexpected error in POST business images:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || String(error),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
});
