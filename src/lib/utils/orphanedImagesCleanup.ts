/**
 * Orphaned Images Cleanup Utility
 * 
 * Validates and cleans up database records that reference
 * images that no longer exist in storage (404/403 errors).
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface CleanupResult {
  totalChecked: number;
  orphanedFound: number;
  deleted: number;
  errors: Array<{ id: string; url: string; error: string }>;
}

/**
 * Validates that an image URL is accessible
 * 
 * @param url - The image URL to validate
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns true if image exists and is accessible
 */
export async function imageExists(
  url: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error: any) {
    // Network errors, timeouts, or CORS issues
    if (error.name === 'AbortError') {
      console.warn(`[Cleanup] Timeout checking image: ${url}`);
    } else {
      console.warn(`[Cleanup] Error checking image ${url}:`, error.message);
    }
    return false;
  }
}

/**
 * Cleans up orphaned image records from the database
 * 
 * @param supabase - Supabase client instance
 * @param businessId - Optional: only check images for a specific business
 * @param batchSize - Number of images to check at once (default: 10)
 * @returns Cleanup result with statistics
 */
export async function cleanupOrphanedImages(
  supabase: SupabaseClient,
  businessId?: string,
  batchSize: number = 10
): Promise<CleanupResult> {
  const result: CleanupResult = {
    totalChecked: 0,
    orphanedFound: 0,
    deleted: 0,
    errors: [],
  };

  try {
    // Fetch images to check
    let query = supabase
      .from('business_images')
      .select('id, url, business_id');

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data: images, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`);
    }

    if (!images || images.length === 0) {
      return result;
    }

    result.totalChecked = images.length;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      // Check all images in batch concurrently
      const existenceChecks = await Promise.all(
        batch.map(async (image) => {
          const exists = await imageExists(image.url);
          return { image, exists };
        })
      );

      // Delete orphaned images
      for (const { image, exists } of existenceChecks) {
        if (!exists) {
          result.orphanedFound++;

          const { error: deleteError } = await supabase
            .from('business_images')
            .delete()
            .eq('id', image.id);

          if (deleteError) {
            result.errors.push({
              id: image.id,
              url: image.url,
              error: deleteError.message,
            });
            console.error(
              `[Cleanup] Failed to delete orphaned image ${image.id}:`,
              deleteError
            );
          } else {
            result.deleted++;
            console.log(
              `[Cleanup] Deleted orphaned image ${image.id} (${image.url})`
            );
          }
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < images.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } catch (error: any) {
    console.error('[Cleanup] Error during orphaned images cleanup:', error);
    throw error;
  }

  return result;
}

/**
 * Creates an API endpoint handler for orphaned images cleanup
 * (Can be called from admin panel or cron job)
 */
export async function cleanupOrphanedImagesHandler(
  supabase: SupabaseClient,
  businessId?: string
) {
  try {
    const result = await cleanupOrphanedImages(supabase, businessId);
    return {
      success: true,
      ...result,
      message: `Checked ${result.totalChecked} images. Found ${result.orphanedFound} orphaned, deleted ${result.deleted}.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

