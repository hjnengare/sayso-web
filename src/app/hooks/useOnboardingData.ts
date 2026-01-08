/**
 * useOnboardingData Hook
 * Simplified to only load from database (DB is source of truth)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadFromDatabase, OnboardingData } from '../lib/onboarding/dataManager';

export interface UseOnboardingDataOptions {
  /**
   * Whether to load from database
   * @default true
   */
  loadFromDatabase?: boolean;
}

export interface UseOnboardingDataReturn {
  data: OnboardingData;
  isLoading: boolean;
  error: Error | null;
  updateInterests: (interests: string[]) => void;
  updateSubcategories: (subcategories: string[]) => void;
  updateDealbreakers: (dealbreakers: string[]) => void;
  updateData: (data: Partial<OnboardingData>) => void;
  clearData: () => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing onboarding data from database only
 * DB is the single source of truth
 */
export function useOnboardingData(
  options: UseOnboardingDataOptions = {}
): UseOnboardingDataReturn {
  const {
    loadFromDatabase: shouldLoadFromDatabase = true,
  } = options;

  const [data, setData] = useState<OnboardingData>({
    interests: [],
    subcategories: [],
    dealbreakers: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isInitialLoadRef = useRef(true);

  /**
   * Load data from database
   */
  const loadData = useCallback(async () => {
    if (!shouldLoadFromDatabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const databaseData = await loadFromDatabase();
      
      setData({
        interests: databaseData.interests || [],
        subcategories: databaseData.subcategories || [],
        dealbreakers: databaseData.dealbreakers || [],
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('[useOnboardingData] Error loading data:', error);
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [shouldLoadFromDatabase]);

  /**
   * Initial load
   */
  useEffect(() => {
    if (isInitialLoadRef.current) {
      loadData();
    }
  }, [loadData]);

  /**
   * Update interests (local state only - actual saving happens via submit functions)
   */
  const updateInterests = useCallback((interests: string[]) => {
    setData((prev) => ({ ...prev, interests }));
  }, []);

  /**
   * Update subcategories (local state only)
   */
  const updateSubcategories = useCallback((subcategories: string[]) => {
    setData((prev) => ({ ...prev, subcategories }));
  }, []);

  /**
   * Update dealbreakers (local state only)
   */
  const updateDealbreakers = useCallback((dealbreakers: string[]) => {
    setData((prev) => ({ ...prev, dealbreakers }));
  }, []);

  /**
   * Update multiple fields at once
   */
  const updateData = useCallback((newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  /**
   * Clear all data (local state only)
   */
  const clearData = useCallback(() => {
    setData({
      interests: [],
      subcategories: [],
      dealbreakers: [],
    });
  }, []);

  /**
   * Refresh data from database
   */
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    updateInterests,
    updateSubcategories,
    updateDealbreakers,
    updateData,
    clearData,
    refresh,
  };
}
