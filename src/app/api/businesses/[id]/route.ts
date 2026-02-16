import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { invalidateBusinessCache, fetchBusinessOptimized } from '../../../lib/utils/optimizedQueries';
import { notifyBusinessUpdated } from '../../../lib/utils/businessUpdateEvents';
import { getInterestIdForSubcategory } from '../../../lib/onboarding/subcategoryMapping';
import { isAdmin } from '../../../lib/admin';

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
    
    if (!businessIdentifier || businessIdentifier.trim() === '') {
      console.error('[API] Invalid business identifier:', businessIdentifier);
      return NextResponse.json(
        { error: 'Business ID or slug is required' },
        { status: 400 }
      );
    }
    
    // Use optimized query function that handles both slug and ID lookups
    const business = await fetchBusinessOptimized(businessIdentifier, req, false);
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Hide non-active businesses from public access (pending/rejected must not leak)
    if (business.status !== 'active') {
      let isOwnerOrAdmin = false;
      try {
        const supabase = await getServerSupabase(req);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          isOwnerOrAdmin =
            business.owner_id === user.id ||
            (await isAdmin(user.id));
        }
      } catch {
        // No auth or auth error — treat as anonymous
      }
      if (!isOwnerOrAdmin) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
    }

    // Normalize taxonomy for consumers: DB uses primary_* after migration; expose legacy names too
    const categorySlug = business.primary_subcategory_slug ?? business.category ?? undefined;
    const categoryLabel = business.primary_subcategory_label ?? business.category_label ?? undefined;
    const interestSlug = business.primary_category_slug ?? business.interest_id ?? undefined;
    const resolvedInterestId =
      interestSlug ??
      (categorySlug ? getInterestIdForSubcategory(categorySlug) : undefined);

    const payload = {
      ...business,
      category: categorySlug,
      category_label: categoryLabel,
      sub_interest_id: categorySlug,
      interest_id: resolvedInterestId,
      interestId: resolvedInterestId,
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[API] Error in GET business:', {
      message: error?.message,
      code: error?.code,
      details: error?.details || error?.toString(),
      stack: error?.stack?.split('\n')[0],
    });
    
    // Return appropriate error status based on error type
    if (error?.message?.includes('not found') || error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch business',
        details: error?.message || 'Internal server error',
      },
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

    if (!businessId || businessId.trim() === '') {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

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
    if (category !== undefined) updateData.primary_subcategory_slug = category.trim();
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
    // Validate businessId first
    if (!businessId || businessId.trim() === '') {
      console.error('[API] Invalid business ID for deletion:', businessId);
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    // ✅ Handle both slug and UUID - resolve slug to UUID if needed
    let actualBusinessId = businessId;
    
    // Check if it's a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId);
    
    if (!isUUID) {
      // It's likely a slug, try to resolve it to a UUID
      console.log('[API] Slug detected, resolving to UUID:', businessId);
      const { data: slugBusiness, error: slugError } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', businessId)
        .maybeSingle();
      
      if (slugError) {
        console.error('[API] Error resolving slug to UUID:', {
          slug: businessId,
          error: slugError.message,
        });
        return NextResponse.json(
          { error: 'Failed to resolve business', details: slugError.message },
          { status: 500 }
        );
      }
      
      if (!slugBusiness) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
      
      actualBusinessId = slugBusiness.id;
      console.log('[API] Resolved slug to UUID:', actualBusinessId);
    }

    // Use maybeSingle() to distinguish between "not found" and "error"
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id, slug')
      .eq('id', actualBusinessId)
      .maybeSingle();

    if (businessError) {
      console.error('[API] Error fetching business for deletion:', {
        businessId,
        error: businessError.message,
        details: businessError,
      });
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
      .eq('business_id', actualBusinessId)
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
      .eq('business_id', actualBusinessId);

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
          console.log(`[API] Deleted ${storagePaths.length} storage files for business ${actualBusinessId}`);
        }
      }
    }

    // Delete business (CASCADE will handle DB records)
    const { error: deleteError } = await supabase
      .from('businesses')
      .delete()
      .eq('id', actualBusinessId);

    if (deleteError) {
      console.error('[API] Error deleting business:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete business', details: deleteError.message },
        { status: 500 }
      );
    }

    // Invalidate cache for this business
    try {
      invalidateBusinessCache(actualBusinessId, business.slug || undefined);
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
    response.headers.set('X-Business-Id', actualBusinessId);

    return response;
  } catch (error: any) {
    console.error('[API] Error in DELETE business:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
