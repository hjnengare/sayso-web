import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { extractStoragePath } from '../../../../../../lib/utils/storagePathExtraction';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/businesses/[id]/images/[imageId]
 * Delete a business image (requires business owner authentication)
 * Deletes from both storage bucket and database, and promotes next image if primary was deleted
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

    // Verify user owns this business (check both business_owners and businesses.owner_id)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check ownership via business_owners table or owner_id
    const { data: ownerCheck } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    const isOwner = ownerCheck || business.owner_id === user.id;

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete images from this business' },
        { status: 403 }
      );
    }

    // Get image details before deletion (need URL for storage deletion and is_primary for promotion)
    const { data: imageData, error: imageCheckError } = await supabase
      .from('business_images')
      .select('id, business_id, url, is_primary')
      .eq('id', imageId)
      .eq('business_id', businessId)
      .single();

    if (imageCheckError || !imageData) {
      return NextResponse.json(
        { error: 'Image not found or does not belong to this business' },
        { status: 404 }
      );
    }

    // Extract storage path from URL using robust extraction utility
    const storagePath = extractStoragePath(imageData.url);

    // Delete from storage bucket (if path can be extracted)
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('business-images')
        .remove([storagePath]);

      if (storageError) {
        console.warn('[API] Error deleting image from storage (continuing with DB delete):', storageError);
        // Continue with DB deletion even if storage deletion fails
      } else {
        console.log(`[API] Successfully deleted storage file: ${storagePath}`);
      }
    } else {
      console.warn('[API] Could not extract storage path from URL, skipping storage deletion:', imageData.url);
    }

    // Delete from database (trigger will automatically promote next image if this was primary)
    const { error: deleteError } = await supabase
      .from('business_images')
      .delete()
      .eq('id', imageId)
      .eq('business_id', businessId);

    if (deleteError) {
      console.error('[API] Error deleting business image from database:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete image', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      was_primary: imageData.is_primary,
      message: imageData.is_primary 
        ? 'Primary image deleted. Next image has been automatically promoted.' 
        : 'Image deleted successfully.'
    });
  } catch (error: any) {
    console.error('[API] Error in DELETE business image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

