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
  category_label?: string;
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
  lat?: number | null;
  lng?: number | null;
  top_review_preview?: {
    content: string;
    rating?: number | null;
    createdAt?: string | null;
  } | null;
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
  /** HTTP status when error is set. Helps UI show status so count 0 doesn't hide the problem. */
  statusCode: number | null;
  refetch: () => void;
  meta?: FeaturedBusinessesMeta | null;
}

export interface FeaturedBusinessesMeta {
  period?: string;
  generated_at?: string;
  seed?: string;
  source?: 'cold_start' | 'rpc' | 'fallback';
  count?: number;
}

/**
 * Hook to fetch featured businesses from the API
 */
export function useFeaturedBusinesses(options: UseFeaturedBusinessesOptions = {}): UseFeaturedBusinessesResult {
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [meta, setMeta] = useState<FeaturedBusinessesMeta | null>(null);

  const fetchFeaturedBusinesses = useCallback(async () => {
    if (options.skip) return;

    setLoading(true);
    setError(null);
    setStatusCode(null);

    try {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.region) params.set('region', options.region);

      const response = await fetch(`/api/featured?${params.toString()}`);

      if (!response.ok) {
        let message = `Failed to fetch featured businesses: ${response.status}`;
        try {
          const body = await response.json();
          message = body?.error || message;
        } catch {
          // keep message
        }
        setStatusCode(response.status);
        setError(`${response.status}: ${message}`);
        setFeaturedBusinesses([]);
        setMeta(null);
        return;
      }

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setFeaturedBusinesses(list);
      setMeta(data && !Array.isArray(data) ? data?.meta ?? null : null);
    } catch (err) {
      console.error('Error fetching featured businesses:', err);
      setStatusCode(null);
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
    statusCode,
    refetch,
    meta,
  };
}
