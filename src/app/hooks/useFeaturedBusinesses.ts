/**
 * Hook to fetch featured businesses from the API
 */

import { useState, useEffect, useCallback } from 'react';

export interface FeaturedBusiness {
  id: string;
  name: string;
  image: string;
  alt: string;
  category: string;
  description: string;
  location: string;
  rating: number;
  reviewCount: number;
  totalRating: number;
  reviews: number;
  badge: "featured";
  rank: number;
  href: string;
  monthAchievement: string;
  verified: boolean;
}

export interface UseFeaturedBusinessesOptions {
  limit?: number;
  region?: string | null;
  skip?: boolean;
}

export interface UseFeaturedBusinessesResult {
  featuredBusinesses: FeaturedBusiness[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch featured businesses from the API
 */
export function useFeaturedBusinesses(options: UseFeaturedBusinessesOptions = {}): UseFeaturedBusinessesResult {
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);

  const fetchFeaturedBusinesses = useCallback(async () => {
    if (options.skip) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.region) params.set('region', options.region);

      const response = await fetch(`/api/featured?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch featured businesses: ${response.status}`);
      }

      const data = await response.json();
      setFeaturedBusinesses(data);
    } catch (err) {
      console.error('Error fetching featured businesses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFeaturedBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [options.limit, options.region, options.skip]);

  useEffect(() => {
    fetchFeaturedBusinesses();
  }, [fetchFeaturedBusinesses]);

  const refetch = useCallback(() => {
    fetchFeaturedBusinesses();
  }, [fetchFeaturedBusinesses]);

  return {
    featuredBusinesses,
    loading,
    error,
    refetch,
  };
}