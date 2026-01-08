/**
 * Onboarding Data Manager
 * Simplified - DB is the single source of truth
 */

export interface OnboardingData {
  interests: string[];
  subcategories: string[];
  dealbreakers: string[];
}

import { apiClient } from '../api/apiClient';

/**
 * Load data from database
 */
export async function loadFromDatabase(): Promise<Partial<OnboardingData>> {
  try {
    // Use shared API client with deduplication and caching
    const data = await apiClient.fetch<{
      interests?: string[];
      subcategories?: { subcategory_id: string }[];
      dealbreakers?: string[];
    }>(
      '/api/user/onboarding',
      {},
      {
        ttl: 10000, // 10 second cache
        useCache: true,
        cacheKey: '/api/user/onboarding',
      }
    );
    
    return {
      interests: data.interests || [],
      subcategories: data.subcategories?.map((s: { subcategory_id: string }) => s.subcategory_id) || [],
      dealbreakers: data.dealbreakers || [],
    };
  } catch (error) {
    console.error('[Data Manager] Error loading from database:', error);
    return {};
  }
}
