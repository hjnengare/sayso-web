/**
 * Simple business search hook
 * Implements the same search pattern as /claim-business page
 * 
 * Features:
 * - 300ms debounce for efficient API calls
 * - Minimum 2 characters to trigger search
 * - Case-insensitive search across name, description, category
 * - Returns up to 20 results
 * - Includes claim status checks
 */

import { useState, useEffect } from 'react';

export interface SearchResult {
  id: string;
  name: string;
  category: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  image_url?: string;
  verified: boolean;
  claim_status: 'unclaimed' | 'claimed' | 'pending';
  pending_by_user?: boolean;
  claimed_by_user?: boolean;
  lat?: number;
  lng?: number;
  slug?: string;
}

export interface UseSimpleBusinessSearchResult {
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
}

export function useSimpleBusinessSearch(searchQuery: string, debounceMs = 300): UseSimpleBusinessSearchResult {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      // Minimum 2 characters to search
      if (searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/businesses/search?query=${encodeURIComponent(searchQuery.trim())}`
        );

        if (!response.ok) {
          throw new Error('Failed to search businesses');
        }

        const data = await response.json();
        setResults(data.businesses || []);
      } catch (err) {
        console.error('Error searching businesses:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search to avoid excessive API calls
    const debounceTimer = setTimeout(performSearch, debounceMs);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, debounceMs]);

  return {
    results,
    isSearching,
    error,
  };
}
