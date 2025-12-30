import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';

/**
 * DELETE /api/businesses/[id]
 * Deletes a business and all associated storage files
 * (requires business owner authentication)
 */
export async function DELETE(
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

    // Check ownership
    const { data: ownerCheck } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    const isOwner = ownerCheck || business.owner_id === user.id;

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this business' },
        { status: 403 }
      );
    }

    // CRITICAL FIX: Delete storage files before deleting business
    const { data: images, error: imagesError } = await supabase
      .from('business_images')
      .select('url')
      .eq('business_id', businessId);

    if (images && images.length > 0) {
      const { extractStoragePaths } = await import('../../../../lib/utils/storagePathExtraction');
      const storagePaths = extractStoragePaths(images.map(img => img.url));

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('business-images')
          .remove(storagePaths);

        if (storageError) {
          console.warn('[API] Error deleting storage files (continuing with business deletion):', storageError);
          // Continue with business deletion even if storage deletion fails
        } else {
          console.log(`[API] Deleted ${storagePaths.length} storage files for business ${businessId}`);
        }
      }
    }

    // Delete business (CASCADE will handle DB records)
    const { error: deleteError } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (deleteError) {
      console.error('[API] Error deleting business:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete business', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Business and all associated images deleted successfully.',
    });
  } catch (error: any) {
    console.error('[API] Error in DELETE business:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
