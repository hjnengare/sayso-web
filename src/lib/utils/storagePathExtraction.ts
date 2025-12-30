/**
 * Storage Path Extraction Utility
 * 
 * Robustly extracts storage paths from Supabase Storage URLs.
 * Handles various URL formats, query parameters, and encoding.
 */

/**
 * Extracts the storage path from a Supabase Storage URL
 * 
 * @param url - The full URL from Supabase Storage
 * @returns The storage path (e.g., "businessId/filename.jpg") or null if extraction fails
 * 
 * @example
 * extractStoragePath("https://project.supabase.co/storage/v1/object/public/business-images/abc123/image.jpg")
 * // Returns: "abc123/image.jpg"
 * 
 * extractStoragePath("https://project.supabase.co/storage/v1/object/public/business-images/abc123/image.jpg?token=xyz")
 * // Returns: "abc123/image.jpg"
 */
export function extractStoragePath(url: string): string | null {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  // Normalize URL - remove whitespace
  const normalizedUrl = url.trim();

  // Check if URL is from business-images bucket
  if (!normalizedUrl.includes('business-images')) {
    console.warn('[Storage Path] URL does not appear to be from business-images bucket:', normalizedUrl);
    return null;
  }

  // Try multiple patterns to handle different URL formats
  const patterns = [
    // Standard format: /business-images/{path}
    /\/business-images\/(.+?)(?:\?|$)/,
    
    // Full storage path: /storage/v1/object/public/business-images/{path}
    /\/storage\/v1\/object\/public\/business-images\/(.+?)(?:\?|$)/,
    
    // Alternative format: business-images/{path}
    /business-images\/(.+?)(?:\?|$)/,
    
    // Fallback: anything after /business-images/
    /\/business-images\/(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = normalizedUrl.match(pattern);
    if (match && match[1]) {
      try {
        // Decode URL encoding (e.g., %20 -> space)
        const decoded = decodeURIComponent(match[1]);
        return decoded;
      } catch (decodeError) {
        // If decoding fails, return the raw match
        console.warn('[Storage Path] Failed to decode URL path:', match[1]);
        return match[1];
      }
    }
  }

  console.warn('[Storage Path] Could not extract path from URL:', normalizedUrl);
  return null;
}

/**
 * Validates that a URL appears to be from Supabase Storage
 * 
 * @param url - The URL to validate
 * @returns true if URL appears to be from Supabase Storage
 */
export function isValidStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check for Supabase storage indicators
  const supabaseIndicators = [
    'supabase.co/storage',
    'supabase.in/storage',
    '/storage/v1/object/public/',
    '/business-images/',
  ];

  return supabaseIndicators.some(indicator => url.includes(indicator));
}

/**
 * Extracts storage paths from multiple URLs
 * 
 * @param urls - Array of URLs
 * @returns Array of valid storage paths (filters out nulls)
 */
export function extractStoragePaths(urls: string[]): string[] {
  return urls
    .map(url => extractStoragePath(url))
    .filter((path): path is string => path !== null);
}

