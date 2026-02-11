"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useDebounce } from "./useDebounce";

export interface LiveSearchFilters {
  distanceKm: number | null;
  minRating: number | null;
}

export interface LiveSearchResult {
  id: string;
  slug?: string;
  name: string;
  category: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  image_url?: string;
  description?: string;
  price_range?: string;
  verified: boolean;
  stats?: {
    average_rating: number;
  };
  badge?: string;
  rating?: number;
  reviews?: number;
  lat?: number | null;
  lng?: number | null;
}

interface UseLiveSearchOptions {
  initialQuery?: string;
  debounceMs?: number;
}

export function useLiveSearch({ initialQuery = "", debounceMs = 300 }: UseLiveSearchOptions = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const debouncedQuery = useDebounce(query, debounceMs);
  const [results, setResults] = useState<LiveSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const filters = useMemo<LiveSearchFilters>(() => ({
    distanceKm,
    minRating,
  }), [distanceKm, minRating]);

  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();

    if (trimmedQuery.length === 0) {
      abortRef.current?.abort();
      setLoading(false);
      setError(null);
      setResults([]);
      return;
    }

    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ q: trimmedQuery });
    if (filters.distanceKm) {
      params.set("distanceKm", filters.distanceKm.toString());
    }
    if (filters.minRating) {
      params.set("minRating", filters.minRating.toString());
    }

    fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Live search failed");
        }
        const payload = await response.json();
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        setResults(payload.results || []);
        setError(payload.error || null);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (currentRequestId !== requestIdRef.current) return;
        setError(err.message || "Search failed");
        setResults([]);
      })
      .finally(() => {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, filters.distanceKm, filters.minRating]);

  const resetFilters = () => {
    setDistanceKm(null);
    setMinRating(null);
  };

  return {
    query,
    setQuery,
    debouncedQuery,
    loading,
    error,
    results,
    filters,
    setDistanceKm,
    setMinRating,
    resetFilters,
  };
}
