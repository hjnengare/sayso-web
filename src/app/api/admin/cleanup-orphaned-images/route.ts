import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';
import { cleanupOrphanedImages } from '../../../lib/utils/orphanedImagesCleanup';

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
export const POST = withAdmin(async (req: NextRequest, { supabase }) => {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || undefined;

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
});
