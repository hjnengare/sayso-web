/**
 * Storage Bucket Configuration
 * Centralized configuration for Supabase Storage buckets
 */

/**
 * Storage bucket names used throughout the application
 */
export const STORAGE_BUCKETS = {
  BUSINESS_IMAGES: 'business-images',
  REVIEW_IMAGES: 'review_images',
} as const;

/**
 * Verify that a storage bucket exists
 * Useful for setup verification and error handling
 */
export async function verifyBucketExists(
  supabase: any,
  bucketName: string
): Promise<{ exists: boolean; error?: string }> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      return { exists: false, error: error.message };
    }
    
    const bucketExists = buckets?.some(bucket => bucket.id === bucketName) ?? false;
    
    if (!bucketExists) {
      return {
        exists: false,
        error: `Bucket "${bucketName}" does not exist. Please create it in Supabase Dashboard > Storage.`,
      };
    }
    
    return { exists: true };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the public URL for a file in the business-images bucket
 */
export function getBusinessImageUrl(filePath: string): string {
  // This will be constructed using Supabase client's getPublicUrl method
  // This is a helper function for consistent URL generation
  return filePath; // Actual URL construction happens in the component using supabase.storage
}

/**
 * Validate business image file
 */
export function validateBusinessImage(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (file.size > MAX_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_SIZE / 1024 / 1024}MB limit` };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Generate storage path for business image
 * Format: {business_id}/{business_id}_{index}_{timestamp}.{ext}
 */
export function generateBusinessImagePath(
  businessId: string,
  index: number,
  timestamp: number,
  fileExtension: string
): string {
  return `${businessId}/${businessId}_${index}_${timestamp}.${fileExtension}`;
}

