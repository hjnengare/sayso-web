/**
 * Optimized Query Utilities
 * High-level utilities combining caching, parallel execution, and connection pooling
 */

import { getPooledSupabaseClient, createParallelClients } from "../supabase/pool";
import { executeParallelQueries, batchFetchByIds, executeWithRetry } from "./asyncQueries";
import { queryCache } from "../cache/queryCache";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch business with all related data in parallel
 * Uses caching and parallel queries for optimal performance
 * Supports both slug and ID lookups (slug first, then ID fallback)
 */
export async function fetchBusinessOptimized(
  businessIdentifier: string, // Can be slug or ID
  request?: Request,
  useCache: boolean = true
) {
  // 👇 For now, hard-disable cache entirely during development
  useCache = false;

  // Cache-related code temporarily disabled:
  // const cacheKey = queryCache.key('business', { id: businessIdentifier });
  // if (useCache) {
  //   const cached = queryCache.get(cacheKey);
  //   if (cached) {
  //     return cached;
  //   }
  // } else {
  //   queryCache.delete(cacheKey);
  //   if (businessIdentifier) {
  //     const idCacheKey = queryCache.key('business', { id: businessIdentifier });
  //     queryCache.delete(idCacheKey);
  //   }
  // }

  // Create parallel clients for independent queries
  const [client1, client2, client3, client4] = await createParallelClients(4);

  // Try slug first, then ID fallback
  let businessResult: any;
  let actualBusinessId: string | null = null;

  // First, try to find by slug
  const slugResult = await executeWithRetry(
    async () => {
      const { data, error } = await client1
        .from('businesses')
        .select('id, slug')
        .eq('slug', businessIdentifier)
        .single();
      return { data, error };
    }
  );

  if (slugResult.data && slugResult.data.id) {
    // Found by slug, use the actual ID for subsequent queries
    actualBusinessId = slugResult.data.id;
  } else {
    // Not found by slug, assume it's an ID and try that
    actualBusinessId = businessIdentifier;
  }

  // Execute all queries in parallel using the actual business ID
  const [finalBusinessResult, reviewsResult, statsResult, businessImagesResult] = await executeParallelQueries([
    // Business data
    async () =>
      executeWithRetry(
        async () => {
          const { data, error } = await client1
            .from('businesses')
            .select('*')
            .eq('id', actualBusinessId)
            .single();
          return { data, error };
        }
      ),
    // Reviews - Limit to 10 initially for faster loading
    async () =>
      executeWithRetry(
        async () => {
          const { data, error } = await client2
            .from('reviews')
            .select('id, user_id, business_id, rating, content, title, tags, created_at, helpful_count')
            .eq('business_id', actualBusinessId)
            .order('created_at', { ascending: false })
            .limit(10);
          return { data, error };
        }
      ),
    // Stats
    async () =>
      executeWithRetry(
        async () => {
          const { data, error } = await client3
            .from('business_stats')
            .select('*')
            .eq('business_id', actualBusinessId)
            .single();
          return { data, error };
        }
      ),
    // Business images from business_images table
    async () =>
      executeWithRetry(
        async () => {
          const { data, error } = await client4
            .from('business_images')
            .select('url, is_primary, sort_order')
            .eq('business_id', actualBusinessId)
            .order('is_primary', { ascending: false })
            .order('sort_order', { ascending: true });
          return { data, error };
        }
      ),
  ]);

  businessResult = finalBusinessResult;

  // Handle errors
  if (businessResult.error || !businessResult.data) {
    throw businessResult.error || new Error('Business not found');
  }

  // Fetch related data if reviews exist
  let reviewsWithProfiles = [];
  if (reviewsResult.data && reviewsResult.data.length > 0) {
    const reviewIds: string[] = reviewsResult.data.map((r: any) => r.id).filter((id): id is string => typeof id === 'string');
    const userIdsArray = reviewsResult.data.map((r: any) => r.user_id).filter((id): id is string => typeof id === 'string');
    const userIds: string[] = Array.from(new Set(userIdsArray));

    // Fetch images and profiles in parallel
    // For review_images, we need to fetch by review_id (not by their own id)
    // For profiles, we need to fetch by user_id (not by id)
    const [imagesResult, profilesResult] = await executeParallelQueries([
      async () => {
        // Fetch review images by review_id - only if we have reviews
        if (reviewIds.length === 0) {
          return { data: [], error: null };
        }
        const { data, error } = await executeWithRetry(
          async () => {
            const result = await client1
              .from('review_images')
              .select('review_id, image_url, storage_path')
              .in('review_id', reviewIds)
              .order('created_at', { ascending: true })
              .limit(100); // Limit total images to prevent large payloads (first image per review)
            return { data: result.data, error: result.error };
          }
        );
        return { data, error };
      },
      async () => {
        // Fetch profiles by user_id (not id) - profiles table uses user_id as primary key
        if (userIds.length === 0) {
          return { data: [], error: null };
        }
        
        // Split into chunks to avoid query size limits
        const chunkSize = 100;
        const chunks: string[][] = [];
        for (let i = 0; i < userIds.length; i += chunkSize) {
          chunks.push(userIds.slice(i, i + chunkSize));
        }
        
        // Execute chunks in parallel
        const chunkPromises = chunks.map(chunk =>
          client2
            .from('profiles')
            .select('user_id, display_name, username, avatar_url')
            .in('user_id', chunk)
            .then(({ data, error }) => ({ data: data as any[] | null, error }))
        );
        
        const results = await Promise.all(chunkPromises);
        
        // Combine results
        const allData: any[] = [];
        let hasError = false;
        let lastError: any = null;
        
        for (const result of results) {
          if (result.error) {
            hasError = true;
            lastError = result.error;
          } else if (result.data && Array.isArray(result.data)) {
            allData.push(...result.data);
          }
        }
        
        return {
          data: hasError ? null : allData,
          error: hasError ? lastError : null
        };
      },
    ]);

    // Combine data
    const imagesMap: Record<string, any[]> = {};
    if (imagesResult.data) {
      imagesResult.data.forEach((img: any) => {
        if (!imagesMap[img.review_id]) {
          imagesMap[img.review_id] = [];
        }
        imagesMap[img.review_id].push(img);
      });
    }

    reviewsWithProfiles = reviewsResult.data.map((review: any) => {
      const profile = profilesResult.data?.find((p: any) => p.user_id === review.user_id);
      const images = imagesMap[review.id] || [];
      
      // Ensure profile is always an object (even if empty) for consistent API handling
      const profileData = profile || null;
      
      return {
        ...review,
        profile: profileData,
        images,
      };
    });
  }

  // Extract image URLs from business_images table and create uploaded_images array for backward compatibility
  let uploadedImages: string[] = [];
  if (businessImagesResult.data && Array.isArray(businessImagesResult.data) && businessImagesResult.data.length > 0) {
    uploadedImages = businessImagesResult.data
      .map((img: any) => img.url)
      .filter((url: string) => url && typeof url === 'string' && url.trim() !== '');
  }

  // Combine results
  // Add uploaded_images array from business_images table (for backward compatibility with existing UI code)
  const result = {
    ...businessResult.data,
    uploaded_images: uploadedImages.length > 0 ? uploadedImages : (businessResult.data?.uploaded_images || []),
    stats: statsResult.data || null,
    reviews: reviewsWithProfiles,
  };

  // Cache result - temporarily disabled
  // if (useCache && actualBusinessId) {
  //   const idCacheKey = queryCache.key('business', { id: actualBusinessId });
  //   const slugCacheKey = queryCache.key('business', { id: result.slug || businessIdentifier });
  //   queryCache.set(idCacheKey, result, 300000);
  //   if (result.slug && result.slug !== actualBusinessId) {
  //     queryCache.set(slugCacheKey, result, 300000);
  //   }
  // }

  return result;
}

/**
 * Fetch multiple businesses in parallel with batching
 */
export async function fetchBusinessesOptimized(
  businessIds: string[],
  request?: Request,
  useCache: boolean = true
) {
  if (businessIds.length === 0) {
    return [];
  }

  // Check cache for each ID
  const uncachedIds: string[] = [];
  const cachedResults: any[] = [];

  if (useCache) {
    for (const id of businessIds) {
      const cacheKey = queryCache.key('business', { id });
      const cached = queryCache.get(cacheKey);
      if (cached) {
        cachedResults.push(cached);
      } else {
        uncachedIds.push(id);
      }
    }
  } else {
    uncachedIds.push(...businessIds);
  }

  // Fetch uncached businesses
  if (uncachedIds.length > 0) {
    const client = request
      ? await getPooledSupabaseClient(request)
      : await getPooledSupabaseClient();

    const result = await batchFetchByIds(client, 'businesses', uncachedIds);

    if (result.data) {
      // Cache each result
      if (useCache) {
        result.data.forEach((business: any) => {
          const cacheKey = queryCache.key('business', { id: business.id });
          queryCache.set(cacheKey, business, 300000);
        });
      }

      cachedResults.push(...result.data);
    }
  }

  return cachedResults;
}

/**
 * Invalidate business cache
 * Accepts both ID and slug to clear both cache entries (businesses are cached by both)
 */
export function invalidateBusinessCache(businessId?: string, slug?: string) {
  // If nothing is passed, nuke all business cache as a fallback
  if (!businessId && !slug) {
    queryCache.deleteByPrefix('business:');
    return;
  }

  if (businessId) {
    const idKey = queryCache.key('business', { id: businessId });
    queryCache.delete(idKey);
  }

  if (slug) {
    const slugKey = queryCache.key('business', { id: slug });
    queryCache.delete(slugKey);
  }
}

