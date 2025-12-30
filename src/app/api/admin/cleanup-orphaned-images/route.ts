import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { cleanupOrphanedImages } from '../../../../lib/utils/orphanedImagesCleanup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/cleanup-orphaned-images
 * Admin endpoint to clean up orphaned image records
 * (images in DB that no longer exist in storage)
 * 
 * Query params:
 * - businessId: Optional - only check images for a specific business
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin check here
    // For now, allow any authenticated user (restrict in production)
    // const isAdmin = await checkAdminStatus(user.id);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    // }

    // Get optional businessId from query params
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || undefined;

    // Run cleanup
    const result = await cleanupOrphanedImages(
      supabase,
      businessId,
      10 // batch size
    );

    return NextResponse.json({
      success: true,
      ...result,
      message: `Checked ${result.totalChecked} images. Found ${result.orphanedFound} orphaned, deleted ${result.deleted}.`,
    });
  } catch (error: any) {
    console.error('[API] Error in cleanup orphaned images:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

