/**
 * Hook to fetch businesses from the API
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Business } from '../components/BusinessCard/BusinessCard';
import { useUserPreferences } from './useUserPreferences';
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
    if (options.skip) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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

      const response = await fetch(`/api/businesses?${params.toString()}`);
      
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
      setBusinesses(data.businesses || data.data || []);
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
  ]);

  useEffect(() => {
    if (options.skip) {
      setLoading(false);
      return;
    }
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

/**
 * Hook to fetch trending businesses (sorted by rating, limited)
 */
export function useTrendingBusinesses(
  limit: number = 10,
  extraOptions: Partial<UseBusinessesOptions> = {}
): UseBusinessesResult {
  return useBusinesses({
    limit,
    sortBy: 'total_rating',
    sortOrder: 'desc',
    feedStrategy: 'mixed',
    ...extraOptions,
  });
}

/**
 * Hook to fetch businesses for "For You" section personalized based on user interests
 */
export function useForYouBusinesses(
  limit: number = 20,
  overrideInterestIds?: string[] | undefined
): UseBusinessesResult {
  const { interests, subcategories, dealbreakers } = useUserPreferences();

  // Use overrideInterestIds if provided, otherwise use user preferences
  const interestIds = useMemo(() => {
    if (overrideInterestIds !== undefined) {
      // If overrideInterestIds is an empty array, don't filter (show all)
      // If it has values, use those
      return overrideInterestIds.length > 0 ? overrideInterestIds : undefined;
    }
    // Default: use user preferences
    const userInterestIds = interests.map((i) => i.id).concat(
      subcategories.map((s) => s.id)
    );
    return userInterestIds.length > 0 ? userInterestIds : undefined;
  }, [overrideInterestIds, interests, subcategories]);

  const dealbreakerIds = dealbreakers.map((d) => d.id);

  const preferredPriceRanges = useMemo(() => {
    if (dealbreakerIds.includes('value-for-money')) {
      return ['$', '$$'];
    }
    return undefined;
  }, [dealbreakerIds]);

  return useBusinesses({
    limit,
    sortBy: 'total_reviews', // Prioritize businesses with reviews first
    sortOrder: 'desc',
    interestIds, // Use computed interestIds (either override or user preferences)
    priceRanges: preferredPriceRanges,
    dealbreakerIds: dealbreakerIds.length > 0 ? dealbreakerIds : undefined,
    feedStrategy: 'mixed',
  });
}

