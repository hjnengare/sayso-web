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
  ui_hints?: {
    badge?: "featured";
    rank?: number;
    period?: string;
    reason?: {
      label: string;
      metric?: string;
      value?: number;
    };
  };
  featured_score?: number;
  recent_reviews_30d?: number;
  recent_reviews_7d?: number;
  bayesian_rating?: number | null;
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
  meta?: FeaturedBusinessesMeta | null;
}

export interface FeaturedBusinessesMeta {
  period?: string;
  generated_at?: string;
  seed?: string;
  source?: 'rpc' | 'fallback';
  count?: number;
}

/**
 * Hook to fetch featured businesses from the API
 */
export function useFeaturedBusinesses(options: UseFeaturedBusinessesOptions = {}): UseFeaturedBusinessesResult {
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<FeaturedBusinessesMeta | null>(null);

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
      if (Array.isArray(data)) {
        setFeaturedBusinesses(data);
        setMeta(null);
      } else {
        setFeaturedBusinesses(data?.data || []);
        setMeta(data?.meta || null);
      }
    } catch (err) {
      console.error('Error fetching featured businesses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFeaturedBusinesses([]);
      setMeta(null);
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
    meta,
  };
}
