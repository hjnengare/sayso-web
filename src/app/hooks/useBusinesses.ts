/**
 * Hook to fetch businesses from the API
 */

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { Business } from '../components/BusinessCard/BusinessCard';
import { type UserPreferences } from './useUserPreferences';
import { businessUpdateEvents } from '../lib/utils/businessUpdateEvents';

export interface UseBusinessesOptions {
  limit?: number;
  category?: string;
  sortBy?: 'total_rating' | 'total_reviews' | 'reviews' | 'created_at' | 'name' | 'relevance' | 'distance' | 'rating' | 'price' | 'combo';
  sortOrder?: 'asc' | 'desc';
  verified?: boolean;
  badge?: string;
  location?: string;
  priceRange?: string;
  interestIds?: string[]; // IDs of interests/subcategories to filter by
  subInterestIds?: string[]; // IDs of subcategories to filter by (sub_interest_id column)
  priceRanges?: string[];
  dealbreakerIds?: string[];
  feedStrategy?: 'mixed' | 'standard';
  skip?: boolean; // Skip fetching if true
  minRating?: number | null; // Minimum rating filter (1-5)
  radius?: number | null; // Distance radius in km
  latitude?: number | null; // User latitude for distance filtering
  longitude?: number | null; // User longitude for distance filtering
  searchQuery?: string | null; // Search query (q parameter)
  radiusKm?: number | null; // Distance radius in km (new parameter name)
  sort?: 'relevance' | 'distance' | 'rating_desc' | 'price_asc' | 'combo'; // New sort parameter
  cache?: RequestCache; // e.g. 'no-store' to bypass browser/cache (useful for debugging)
}

export interface UseForYouOptions extends Partial<UseBusinessesOptions> {
  initialBusinesses?: Business[];
  skipInitialFetch?: boolean;
  initialPreferences?: UserPreferences;
  skipPreferencesFetch?: boolean;
  preferences?: UserPreferences;
  preferencesLoading?: boolean;
}

export interface UseBusinessesResult {
  businesses: Business[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch businesses from the API
 */
export function useBusinesses(options: UseBusinessesOptions = {}): UseBusinessesResult {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 [useBusinesses] API Request Details');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[useBusinesses] fetchBusinesses called', {
      skip: options.skip,
      limit: options.limit,
      interestIds: options.interestIds,
      subInterestIds: options.subInterestIds,
      category: options.category,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      feedStrategy: options.feedStrategy,
    });
    
    if (options.skip) {
      console.log('[useBusinesses] Skipping fetch (skip=true)');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[useBusinesses] Starting fetch...');

      const params = new URLSearchParams();
      
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.category) params.set('category', options.category);
      if (options.sortBy) params.set('sort_by', options.sortBy);
      if (options.sortOrder) params.set('sort_order', options.sortOrder);
      if (options.verified !== undefined) params.set('verified', options.verified.toString());
      if (options.badge) params.set('badge', options.badge);
      if (options.location) params.set('location', options.location);
      if (options.priceRange) params.set('price_range', options.priceRange);
      if (options.interestIds && options.interestIds.length > 0) {
        params.set('interest_ids', options.interestIds.join(','));
        console.log('[useBusinesses] Added interest_ids param:', options.interestIds.join(','));
      }
      if (options.subInterestIds && options.subInterestIds.length > 0) {
        params.set('sub_interest_ids', options.subInterestIds.join(','));
        console.log('[useBusinesses] Added sub_interest_ids param:', options.subInterestIds.join(','));
      }
      if (options.priceRanges && options.priceRanges.length > 0) {
        params.set('preferred_price_ranges', options.priceRanges.join(','));
      }
      if (options.dealbreakerIds && options.dealbreakerIds.length > 0) {
        params.set('dealbreakers', options.dealbreakerIds.join(','));
      }
      if (options.feedStrategy) params.set('feed_strategy', options.feedStrategy);
      if (options.minRating !== null && options.minRating !== undefined) {
        params.set('min_rating', options.minRating.toString());
      }
      // Enhanced search query parameter
      if (options.searchQuery && options.searchQuery.trim().length > 0) {
        params.set('q', options.searchQuery.trim());
      }

      // Enhanced sorting
      if (options.sort) {
        params.set('sort', options.sort);
      }

      // Distance-based filtering (support both old and new parameter names)
      const radius = options.radiusKm ?? options.radius;
      if (radius !== null && radius !== undefined && options.latitude && options.longitude) {
        params.set('radius_km', radius.toString());
        params.set('lat', options.latitude.toString());
        params.set('lng', options.longitude.toString());
      } else if (options.radius !== null && options.radius !== undefined && options.latitude && options.longitude) {
        // Legacy support
        params.set('radius', options.radius.toString());
        params.set('lat', options.latitude.toString());
        params.set('lng', options.longitude.toString());
      }

      const url = `/api/businesses?${params.toString()}`;
      console.log('[useBusinesses] Fetching businesses from:', url);
      console.log('[useBusinesses] ⚠️ NOTE: API route logs appear in SERVER TERMINAL, not browser console!');
      console.log('[useBusinesses] Check your Next.js dev server terminal for detailed API logs.');
      
      const fetchOptions: RequestInit = {};
      if (options.cache) fetchOptions.cache = options.cache;
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const rawText = await response.text();
        
        let errorData: any = null;
        
        if (contentType.includes("application/json")) {
          try {
            errorData = rawText ? JSON.parse(rawText) : null;
          } catch (e) {
            errorData = { parseError: String(e), rawText };
          }
        } else {
          errorData = { rawText };
        }
        
        console.error("[useBusinesses] API error response:", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          errorData,
          rawText,
          url: `/api/businesses?${params.toString()}`,
        });
        
        const message =
          errorData?.error ||
          errorData?.details ||
          errorData?.message ||
          `Failed to fetch businesses: ${response.statusText} (${response.status})`;
        
        throw new Error(message);
      }

      const data = await response.json();
      // API returns { businesses: [...], cursorId: ... }
      const businessesList = data.businesses || data.data || [];
      
      // Prominent logging for debugging
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 [useBusinesses] API RESPONSE RECEIVED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[useBusinesses] Response structure:', {
        hasBusinesses: 'businesses' in data,
        hasData: 'data' in data,
        businessesCount: data.businesses?.length || 0,
        dataCount: data.data?.length || 0,
        finalCount: businessesList.length,
      });
      console.log('[useBusinesses] Businesses received:', {
        count: businessesList.length,
        hasBusinesses: businessesList.length > 0,
        firstBusiness: businessesList[0] ? {
          id: businessesList[0].id,
          name: businessesList[0].name,
          hasImage: !!(businessesList[0].image || businessesList[0].image_url || businessesList[0].uploaded_images),
          uploadedImagesCount: businessesList[0].uploaded_images?.length || 0,
        } : 'none',
        sampleIds: businessesList.slice(0, 3).map(b => b.id),
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (businessesList.length === 0) {
        console.warn('⚠️ [useBusinesses] WARNING: Received 0 businesses from API!');
        console.warn('⚠️ Check SERVER TERMINAL for detailed API logs:');
        console.warn('⚠️ Look for: [BUSINESSES API] Raw active businesses count');
        console.warn('⚠️ Look for: [BUSINESSES API] Mixed feed buckets');
        console.warn('⚠️ Look for: [BUSINESSES API] Final transformed businesses');
      }
      
      setBusinesses(businessesList);
    } catch (err: any) {
      console.error('[useBusinesses] Error fetching businesses:', err);
      setError(err.message || 'Failed to fetch businesses');
      setBusinesses([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  }, [
    options.skip,
    options.limit,
    options.category,
    options.sortBy,
    options.sortOrder,
    options.verified,
    options.badge,
    options.location,
    options.priceRange,
    options.interestIds?.join(','),
    options.priceRanges?.join(','),
    options.dealbreakerIds?.join(','),
    options.feedStrategy,
    options.minRating,
    options.radius,
    options.radiusKm,
    options.latitude,
    options.longitude,
    options.searchQuery,
    options.sort,
    options.cache,
  ]);

  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [useBusinesses] useEffect triggered');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[useBusinesses] Options:', {
      skip: options.skip,
      willFetch: !options.skip,
      limit: options.limit,
      feedStrategy: options.feedStrategy,
      interestIds: options.interestIds?.length || 0,
      category: options.category,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    });
    
    if (options.skip) {
      console.log('[useBusinesses] ⏭️ Skipping fetch (skip=true)');
      setLoading(false);
      return;
    }
    console.log('[useBusinesses] ✅ Calling fetchBusinesses from useEffect');
    fetchBusinesses();
  }, [fetchBusinesses, options.skip]);

  // Listen for business update events and refetch
  useEffect(() => {
    if (options.skip) return;

    const unsubscribeUpdate = businessUpdateEvents.onUpdate(() => {
      // Refetch businesses when any business is updated
      // This ensures listing pages show updated data
      fetchBusinesses();
    });

    const unsubscribeDelete = businessUpdateEvents.onDelete((deletedBusinessId: string) => {
      // Remove deleted business from state immediately
      setBusinesses(prev => prev.filter(b => b.id !== deletedBusinessId));
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [options.skip, fetchBusinesses]);

  return {
    businesses,
    loading,
    error,
    refetch: fetchBusinesses,
  };
}

// Trending is now a first-class global feed (not personalized mixed feed).
// Re-export from the standalone hook for backward compatibility.
export { useTrendingBusinesses } from './useTrendingBusinesses';

/**
 * Hook to fetch businesses for "For You" section personalized based on user interests
 *
 * Backend uses Netflix-style two-stage recommender (V2):
 * - Stage A: Candidate generation (personalized, top-rated, fresh, explore)
 * - Stage B: Ranking with decay curves and diversity enforcement
 *
 * The backend handles fallback logic, but we keep client-side fallback for resilience.
 */
export function useForYouBusinesses(
  limit: number = 20,
  overrideInterestIds?: string[] | undefined,
  extraOptions: UseForYouOptions = {}
): UseBusinessesResult {
  const preferenceSource = extraOptions.preferences ?? extraOptions.initialPreferences;
  const preferenceInterests = preferenceSource?.interests ?? [];
  const preferenceSubcategories = preferenceSource?.subcategories ?? [];
  const preferenceDealbreakers = preferenceSource?.dealbreakers ?? [];
  const preferencesLoading = extraOptions.preferencesLoading ?? false;

  const hasInitialBusinesses = (extraOptions.initialBusinesses?.length ?? 0) > 0;
  const [businesses, setBusinesses] = useState<Business[]>(extraOptions.initialBusinesses ?? []);
  const [loading, setLoading] = useState(!extraOptions.skip && !hasInitialBusinesses);
  const [error, setError] = useState<string | null>(null);
  const skipInitialFetchRef = useRef(true);
  const lastRequestKeyRef = useRef<string | null>(null);

  // Use overrideInterestIds if provided, otherwise use user preferences
  const interestIds = useMemo(() => {
    if (overrideInterestIds !== undefined) {
      return overrideInterestIds.length > 0 ? overrideInterestIds : undefined;
    }
    // Combine both interests and subcategories for broader matching
    const userInterestIds = preferenceInterests.map((i) => i.id);
    return userInterestIds.length > 0 ? userInterestIds : undefined;
  }, [overrideInterestIds, preferenceInterests]);

  // Pass subcategories separately for more precise matching
  const subInterestIds = useMemo(() => {
    if (overrideInterestIds !== undefined) {
      return undefined; // Don't use subcategories when override is provided
    }
    const userSubInterestIds = preferenceSubcategories.map((s) => s.id);
    return userSubInterestIds.length > 0 ? userSubInterestIds : undefined;
  }, [overrideInterestIds, preferenceSubcategories]);

  // Memoize dealbreakerIds to prevent infinite re-renders
  const dealbreakerIds = useMemo(
    () => preferenceDealbreakers.map((d) => d.id),
    [preferenceDealbreakers]
  );

  const preferredPriceRanges = useMemo(() => {
    if (dealbreakerIds.includes('value-for-money')) {
      return ['$', '$$'];
    }
    return undefined;
  }, [dealbreakerIds]);

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        limit,
        interestIds: interestIds ?? [],
        subInterestIds: subInterestIds ?? [],
        dealbreakerIds,
        preferredPriceRanges: preferredPriceRanges ?? [],
        latitude: extraOptions.latitude ?? null,
        longitude: extraOptions.longitude ?? null,
      }),
    [
      limit,
      interestIds,
      subInterestIds,
      dealbreakerIds,
      preferredPriceRanges,
      extraOptions.latitude,
      extraOptions.longitude,
    ]
  );

  // No longer block on client-side preferences. The server fetches
  // preferences internally when they are not provided in URL params,
  // eliminating the client-side waterfall (auth → prefs → feed).
  const fetchForYou = useCallback(async (force = false) => {
    if (extraOptions.skip) {
      setLoading(false);
      return;
    }

    if (!force && lastRequestKeyRef.current === requestKey) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      lastRequestKeyRef.current = requestKey;

      console.log('[useForYouBusinesses] Fetching with V2 recommender:', {
        interestIds: interestIds?.length || 0,
        subInterestIds: subInterestIds?.length || 0,
        dealbreakerIds: dealbreakerIds.length,
        preferredPriceRanges: preferredPriceRanges?.length || 0,
      });

      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('feed_strategy', 'mixed');

      // Pass interests (broad) → API filters by primary_category_slug
      if (interestIds && interestIds.length > 0) {
        params.set('interest_ids', interestIds.join(','));
      }
      // Pass subcategories (specific) → API filters by primary_subcategory_slug
      if (subInterestIds && subInterestIds.length > 0) {
        params.set('sub_interest_ids', subInterestIds.join(','));
      }

      // Pass dealbreakers
      if (dealbreakerIds.length > 0) {
        params.set('dealbreakers', dealbreakerIds.join(','));
      }

      // Pass price preferences
      if (preferredPriceRanges && preferredPriceRanges.length > 0) {
        params.set('preferred_price_ranges', preferredPriceRanges.join(','));
      }

      // Include location if available in extraOptions
      if (extraOptions.latitude && extraOptions.longitude) {
        params.set('lat', extraOptions.latitude.toString());
        params.set('lng', extraOptions.longitude.toString());
      }

      const response = await fetch(`/api/businesses?${params.toString()}`);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data?.error ?? (response.status === 404 ? 'For You feed unavailable' : response.statusText);
        throw new Error(`${message} (${response.status})`);
      }

      const businessesList = data.businesses || data.data || [];

      console.log(`[useForYouBusinesses] Received ${businessesList.length} businesses`);
      setBusinesses(businessesList);

    } catch (err: any) {
      console.error('[useForYouBusinesses] Error fetching:', err);
      setError(err.message || 'Failed to fetch businesses');
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [
    extraOptions.skip,
    extraOptions.latitude,
    extraOptions.longitude,
    limit,
    interestIds,
    subInterestIds,
    dealbreakerIds,
    preferredPriceRanges,
    requestKey,
  ]);

  // Fire For You request as soon as the component is committed (before paint) so content shows right away
  useLayoutEffect(() => {
    const shouldSkipInitialFetch =
      extraOptions.skipInitialFetch && hasInitialBusinesses && skipInitialFetchRef.current;

    if (shouldSkipInitialFetch) {
      skipInitialFetchRef.current = false;
      if (!lastRequestKeyRef.current) {
        lastRequestKeyRef.current = requestKey;
      }
      setLoading(false);
      return;
    }

    fetchForYou();
  }, [fetchForYou, extraOptions.skipInitialFetch, hasInitialBusinesses, requestKey]);

  return {
    businesses,
    loading,
    error,
    refetch: () => fetchForYou(true),
  };
}
