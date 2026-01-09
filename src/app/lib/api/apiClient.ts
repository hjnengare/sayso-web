/**
 * Shared API Client with Request Deduplication and Caching
 * Prevents duplicate concurrent requests and provides shared cache
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in ms
}

class ApiClient {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private defaultCacheTTL = 5000; // 5 seconds default cache
  private isDev = process.env.NODE_ENV === 'development';

  /**
   * Fetch with deduplication and caching
   * In development, caching is disabled to ensure fresh data
   */
  async fetch<T>(
    url: string,
    options: RequestInit = {},
    cacheOptions: {
      ttl?: number;
      useCache?: boolean;
      cacheKey?: string;
    } = {}
  ): Promise<T> {
    const {
      ttl = this.defaultCacheTTL,
      useCache = !this.isDev, // Disable cache in dev mode
      cacheKey = url,
    } = cacheOptions;

    // In dev mode, always skip cache
    if (this.isDev) {
      // Still check pending requests to avoid duplicate concurrent requests
      const pending = this.pendingRequests.get(cacheKey);
      if (pending && Date.now() - pending.timestamp < 1000) {
        return pending.promise;
      }
    } else {
      // Check cache first (production only)
      if (useCache) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          return Promise.resolve(cached.data);
        }
      }
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      // If pending request is less than 1 second old, reuse it
      if (Date.now() - pending.timestamp < 1000) {
        return pending.promise;
      }
      // Otherwise, remove stale pending request
      this.pendingRequests.delete(cacheKey);
    }

    // Create new request with no-store cache in dev mode
    const fetchOptions: RequestInit = {
      ...options,
      credentials: 'include',
    };
    
    // Force no-store in dev mode to prevent any caching
    if (this.isDev) {
      fetchOptions.cache = 'no-store';
    }
    
    const requestPromise = fetch(url, fetchOptions)
      .then(async (response) => {
        // Remove from pending
        this.pendingRequests.delete(cacheKey);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache successful responses
        if (useCache && response.ok) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl,
          });
        }

        return data;
      })
      .catch((error) => {
        // Remove from pending on error
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(cacheKey, {
      promise: requestPromise,
      timestamp: Date.now(),
    });

    return requestPromise;
  }

  /**
   * Invalidate cache for a specific key or all cache
   */
  invalidateCache(cacheKey?: string) {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clear all pending requests (useful for cleanup)
   */
  clearPendingRequests() {
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
      pendingKeys: Array.from(this.pendingRequests.keys()),
    };
  }
}

// Singleton instance
export const apiClient = new ApiClient();

/**
 * Hook-friendly wrapper for API client
 */
export function useApiClient() {
  return apiClient;
}

