import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/businesses/[id]/images
 * Fetch all images for a business from uploaded_images array
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

    // Fetch business with uploaded_images array
    const { data: business, error } = await supabase
      .from('businesses')
      .select('uploaded_images')
      .eq('id', businessId)
      .single();

    if (error) {
      console.error('[API] Error fetching business images:', error);
      return NextResponse.json(
        { error: 'Failed to fetch business images', details: error.message },
        { status: 500 }
      );
    }

    // Return images as array of URLs (first image is primary/cover)
    const images = business?.uploaded_images && Array.isArray(business.uploaded_images)
      ? business.uploaded_images.map((url: string, index: number) => ({
          url,
          is_primary: index === 0,
          sort_order: index,
        }))
      : [];

    return NextResponse.json({ images });
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
 * Appends URLs to uploaded_images array
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
      console.error('[API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message || 'User not authenticated', code: 'AUTH_ERROR' },
        { status: 401 }
      );
    }

    // Verify user owns this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id, uploaded_images')
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
    const { images } = body; // Array of { url } objects

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

    // Get existing uploaded_images array or initialize as empty
    const existingImages = (business.uploaded_images && Array.isArray(business.uploaded_images))
      ? business.uploaded_images
      : [];

    // Check image limit (max 10 images per business)
    const MAX_IMAGES = 10;
    const currentCount = existingImages.length;
    const newCount = newUrls.length;
    
    if (currentCount + newCount > MAX_IMAGES) {
      const remainingSlots = MAX_IMAGES - currentCount;
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
          current_count: currentCount,
          attempted_count: newCount,
          remaining_slots: remainingSlots
        },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Use PostgreSQL array concatenation operator (||) for atomic updates
    // This prevents race conditions with concurrent uploads
    // COALESCE handles NULL arrays by treating them as empty arrays
    const { data: updatedBusiness, error: updateError } = await supabase
      .rpc('append_business_images', {
        p_business_id: businessId,
        p_image_urls: newUrls
      });

    // Handle RPC errors
    if (updateError) {
      console.error('[API] Error calling append_business_images:', updateError);
      
      // If function doesn't exist, fallback to standard update
      if (updateError.code === '42883') { // Function does not exist
        console.warn('[API] append_business_images function not found, using fallback method (may have race conditions)');
        
        // Re-fetch business to get latest state (helps reduce race conditions)
        const { data: refreshedBusiness } = await supabase
          .from('businesses')
          .select('uploaded_images')
          .eq('id', businessId)
          .single();
        
        if (!refreshedBusiness) {
          return NextResponse.json(
            { error: 'Business not found' },
            { status: 404 }
          );
        }
        
        const latestImages = (refreshedBusiness.uploaded_images && Array.isArray(refreshedBusiness.uploaded_images))
          ? refreshedBusiness.uploaded_images
          : [];
        
        // Check limit again with latest count
        if (latestImages.length + newUrls.length > MAX_IMAGES) {
          const remainingSlots = MAX_IMAGES - latestImages.length;
          if (remainingSlots <= 0) {
            return NextResponse.json(
              { error: `Maximum image limit reached (${MAX_IMAGES} images). Please delete some images before adding new ones.` },
              { status: 400 }
            );
          }
          newUrls.splice(remainingSlots);
        }
        
        const updatedImages = [...latestImages, ...newUrls];
        
        const { data: fallbackBusiness, error: fallbackError } = await supabase
          .from('businesses')
          .update({ uploaded_images: updatedImages })
          .eq('id', businessId)
          .select('uploaded_images')
          .single();
        
        if (fallbackError) {
          console.error('[API] Fallback update error:', fallbackError);
          return NextResponse.json(
            { error: 'Failed to add images', details: fallbackError.message },
            { status: 500 }
          );
        }
        
        // Use fallback result
        const finalImages = fallbackBusiness?.uploaded_images || [];
        
        // Return the new images (last N images added)
        const addedImages = finalImages.slice(-newUrls.length).map((url: string, index: number) => ({
          url,
          is_primary: finalImages.indexOf(url) === 0,
          sort_order: finalImages.indexOf(url),
        }));

        return NextResponse.json({
          success: true,
          images: addedImages,
          warning: 'Used fallback update method - consider creating append_business_images function for better concurrency',
        }, { status: 201 });
      } else {
        // Other RPC errors (not function missing)
        console.error('[API] RPC error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        return NextResponse.json(
          { 
            error: 'Failed to add images', 
            details: updateError.message || 'Database error occurred',
            code: updateError.code 
          },
          { status: 500 }
        );
      }
    }
    
    // Success case - RPC function worked
    // Get final images from result
    // RPC returns table with uploaded_images array: [{ uploaded_images: [...] }]
    let finalImages: string[] = [];
    
    if (updatedBusiness && Array.isArray(updatedBusiness) && updatedBusiness.length > 0) {
      // RPC returns table with uploaded_images array
      finalImages = updatedBusiness[0].uploaded_images || [];
    } else {
      // Re-fetch to get final state if RPC didn't return it
      const { data: finalBusiness, error: fetchError } = await supabase
        .from('businesses')
        .select('uploaded_images')
        .eq('id', businessId)
        .single();
      
      if (fetchError || !finalBusiness) {
        console.error('[API] Error fetching final business state:', fetchError);
        return NextResponse.json(
          { 
            error: 'Failed to retrieve updated business images', 
            details: fetchError?.message || 'Business not found',
            code: 'FETCH_ERROR'
          },
          { status: 500 }
        );
      }
      
      finalImages = (finalBusiness.uploaded_images && Array.isArray(finalBusiness.uploaded_images))
        ? finalBusiness.uploaded_images
        : [];
    }

    // Return the new images (last N images added)
    const addedImages = finalImages.slice(-newUrls.length).map((url: string, index: number) => ({
      url,
      is_primary: finalImages.indexOf(url) === 0,
      sort_order: finalImages.indexOf(url),
    }));

    return NextResponse.json({
      success: true,
      images: addedImages,
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
}
