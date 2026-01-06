import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { invalidateBusinessCache, fetchBusinessOptimized } from '../../../lib/utils/optimizedQueries';
import { notifyBusinessUpdated } from '../../../lib/utils/businessUpdateEvents';

/**
 * GET /api/businesses/[id]
 * Fetches a single business by ID or slug (public access)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessIdentifier } = await params;
    
    // Use optimized query function that handles both slug and ID lookups
    const business = await fetchBusinessOptimized(businessIdentifier, req, false);
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(business);
  } catch (error: any) {
    console.error('[API] Error in GET business:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/businesses/[id]
 * Updates business details (requires business owner authentication)
 */
export async function PUT(
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
      .select('id, owner_id, slug')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

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
        { error: 'You do not have permission to update this business' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      name,
      description,
      category,
      address,
      phone,
      email,
      website,
      priceRange,
      hours,
    } = body;

    // Build update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category.trim();
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (priceRange !== undefined) updateData.price_range = priceRange;
    if (hours !== undefined) updateData.hours = hours;

    // Update business
    const { data: updatedBusiness, error: updateError } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select('id, slug')
      .single();

    if (updateError) {
      console.error('[API] Error updating business:', updateError);
      return NextResponse.json(
        { error: 'Failed to update business', details: updateError.message },
        { status: 500 }
      );
    }

    // Invalidate cache for this business
    try {
      invalidateBusinessCache(businessId, business.slug || undefined);
    } catch (cacheError) {
      // Log but don't fail - cache invalidation is non-critical
      console.warn('[API] Error invalidating cache:', cacheError);
    }

    // Note: notifyBusinessUpdated is client-side only, so we'll handle it in the edit page
    // The response headers will signal the client to trigger the event

    // Return response with cache invalidation headers
    const response = NextResponse.json({
      success: true,
      business: updatedBusiness,
      message: 'Business updated successfully',
    });

    // Add headers to signal clients to refresh
    response.headers.set('X-Business-Updated', 'true');
    response.headers.set('X-Business-Id', businessId);
    if (business.slug) {
      response.headers.set('X-Business-Slug', business.slug);
    }

    return response;
  } catch (error: any) {
    console.error('[API] Error in PUT business:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

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

    // ✅ Read the business first (so we can return proper errors)
    // Use maybeSingle() to distinguish between "not found" and "error"
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id, slug')
      .eq('id', businessId)
      .maybeSingle();

    if (businessError) {
      console.error('[API] Error fetching business for deletion:', businessError);
      return NextResponse.json(
        { error: 'Failed to fetch business', details: businessError.message },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // ✅ Ownership check (check both owner_id and business_owners table)
    const { data: ownerCheck } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    const isOwner = ownerCheck || business.owner_id === user.id;

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this business' },
        { status: 403 }
      );
    }

    // CRITICAL FIX: Delete storage files before deleting business
    const { data: businessImages, error: businessImagesError } = await supabase
      .from('business_images')
      .select('url')
      .eq('business_id', businessId);

    if (businessImages && businessImages.length > 0) {
      const { extractStoragePaths } = await import('../../../../lib/utils/storagePathExtraction');
      const imageUrls = businessImages.map(img => img.url).filter(Boolean);
      const storagePaths = extractStoragePaths(imageUrls);

      if (storagePaths.length > 0) {
          const { STORAGE_BUCKETS } = await import('@/app/lib/utils/storageBucketConfig');
          const { error: storageError } = await supabase.storage
            .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
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

    // Invalidate cache for this business
    try {
      invalidateBusinessCache(businessId, business.slug || undefined);
    } catch (cacheError) {
      // Log but don't fail - cache invalidation is non-critical
      console.warn('[API] Error invalidating cache:', cacheError);
    }

    // Return response with deletion headers
    const response = NextResponse.json({
      success: true,
      message: 'Business and all associated images deleted successfully.',
    });

    // Add headers to signal clients about deletion
    response.headers.set('X-Business-Deleted', 'true');
    response.headers.set('X-Business-Id', businessId);

    return response;
  } catch (error: any) {
    console.error('[API] Error in DELETE business:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
