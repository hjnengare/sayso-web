import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/businesses/[id]/images
 * Fetch all images for a business
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

    // Fetch business images ordered by primary first, then sort_order
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

    return NextResponse.json({ images: images || [] });
  } catch (error: any) {
    console.error('[API] Error in GET business images:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/businesses/[id]/images
 * Add images to a business (requires business owner authentication)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const supabase = await getServerSupabase(req);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this business
    const { data: ownerCheck, error: ownerError } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    if (ownerError || !ownerCheck) {
      return NextResponse.json(
        { error: 'You do not have permission to add images to this business' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { images } = body; // Array of { url, type?, sort_order?, is_primary? }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Images array is required' },
        { status: 400 }
      );
    }

    // Prepare image records
    const imageRecords = images.map((img: any, index: number) => ({
      business_id: businessId,
      url: img.url,
      type: img.type || (index === 0 ? 'cover' : 'gallery'),
      sort_order: img.sort_order !== undefined ? img.sort_order : index,
      is_primary: img.is_primary !== undefined ? img.is_primary : (index === 0),
    }));

    // Insert images
    const { data: insertedImages, error: insertError } = await supabase
      .from('business_images')
      .insert(imageRecords)
      .select();

    if (insertError) {
      console.error('[API] Error inserting business images:', insertError);
      return NextResponse.json(
        { error: 'Failed to add images', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images: insertedImages,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error in POST business images:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/businesses/[id]/images/[imageId]
 * Delete a business image (requires business owner authentication)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id: businessId, imageId } = await params;
    const supabase = await getServerSupabase(req);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this business
    const { data: ownerCheck, error: ownerError } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    if (ownerError || !ownerCheck) {
      return NextResponse.json(
        { error: 'You do not have permission to delete images from this business' },
        { status: 403 }
      );
    }

    // Verify the image belongs to this business
    const { data: imageCheck, error: imageCheckError } = await supabase
      .from('business_images')
      .select('id, business_id')
      .eq('id', imageId)
      .eq('business_id', businessId)
      .single();

    if (imageCheckError || !imageCheck) {
      return NextResponse.json(
        { error: 'Image not found or does not belong to this business' },
        { status: 404 }
      );
    }

    // Delete the image
    const { error: deleteError } = await supabase
      .from('business_images')
      .delete()
      .eq('id', imageId)
      .eq('business_id', businessId);

    if (deleteError) {
      console.error('[API] Error deleting business image:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete image', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error in DELETE business image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

