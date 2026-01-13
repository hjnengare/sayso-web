"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  HomeFilters,
  FilterState,
  getDefaultFilters,
  countActiveFilters,
  SortOption,
  PriceRange,
  DistanceOption,
  LocationFilter
} from '../types/filters';

interface FilterContextType {
  filters: FilterState;
  defaultFilters: HomeFilters;

  // Filter actions
  setLocation: (location: LocationFilter) => void;
  setCategories: (categories: string[]) => void;
  setMinRating: (rating: number) => void;
  setSortBy: (sort: SortOption) => void;
  setPriceRange: (prices: PriceRange[]) => void;
  setOpenNow: (open: boolean) => void;
  setMustMeetDealbreakers: (mustMeet: boolean) => void;
  setSubcategories: (subcategories: string[]) => void;
  setFeatures: (features: string[]) => void;

  // Bulk actions
  resetFilters: () => void;
  toggleAdvanced: () => void;

  // Helper
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

export function FilterProvider({ children }: FilterProviderProps) {
  const { user } = useAuth();

  // Get user's interests from profile for default filters
  const userInterests = useMemo(() => {
    // This would come from user_interests table in real implementation
    // For now, return empty array
    return [];
  }, [user]);

  // Default filters based on user onboarding
  const defaultFilters = useMemo(
    () => getDefaultFilters(userInterests),
    [userInterests]
  );

  // Initialize filters from localStorage or defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window === 'undefined') {
      return {
        ...defaultFilters,
        isAdvancedOpen: false,
        activeFiltersCount: 0,
      };
    }

    try {
      const stored = localStorage.getItem('home_filters');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          isAdvancedOpen: false,
          activeFiltersCount: countActiveFilters(parsed, defaultFilters),
        };
      }
    } catch (error) {
      console.error('[FilterContext] Error loading filters from localStorage:', error);
    }

    return {
      ...defaultFilters,
      isAdvancedOpen: false,
      activeFiltersCount: 0,
    };
  });

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Don't persist UI state (isAdvancedOpen)
      const { isAdvancedOpen, activeFiltersCount, ...persistableFilters } = filters;
      localStorage.setItem('home_filters', JSON.stringify(persistableFilters));
    } catch (error) {
      console.error('[FilterContext] Error saving filters to localStorage:', error);
    }
  }, [filters]);

  // Update active filters count when filters change
  const activeCount = useMemo(
    () => countActiveFilters(filters, defaultFilters),
    [filters, defaultFilters]
  );

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      activeFiltersCount: activeCount,
    }));
  }, [activeCount]);

  // Filter actions
  const setLocation = useCallback((location: LocationFilter) => {
    setFilters(prev => ({ ...prev, location }));
  }, []);

  const setCategories = useCallback((categories: string[]) => {
    setFilters(prev => ({ ...prev, categories }));
  }, []);

  const setMinRating = useCallback((minRating: number) => {
    setFilters(prev => ({ ...prev, minRating }));
  }, []);

  const setSortBy = useCallback((sortBy: SortOption) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  const setPriceRange = useCallback((priceRange: PriceRange[]) => {
    setFilters(prev => ({ ...prev, priceRange }));
  }, []);

  const setOpenNow = useCallback((openNow: boolean) => {
    setFilters(prev => ({ ...prev, openNow }));
  }, []);

  const setMustMeetDealbreakers = useCallback((mustMeetDealbreakers: boolean) => {
    setFilters(prev => ({ ...prev, mustMeetDealbreakers }));
  }, []);

  const setSubcategories = useCallback((subcategories: string[]) => {
    setFilters(prev => ({ ...prev, subcategories }));
  }, []);

  const setFeatures = useCallback((features: string[]) => {
    setFilters(prev => ({ ...prev, features }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      ...defaultFilters,
      isAdvancedOpen: false,
      activeFiltersCount: 0,
    });
  }, [defaultFilters]);

  const toggleAdvanced = useCallback(() => {
    setFilters(prev => ({ ...prev, isAdvancedOpen: !prev.isAdvancedOpen }));
  }, []);

  const hasActiveFilters = filters.activeFiltersCount > 0;

  const value: FilterContextType = {
    filters,
    defaultFilters,
    setLocation,
    setCategories,
    setMinRating,
    setSortBy,
    setPriceRange,
    setOpenNow,
    setMustMeetDealbreakers,
    setSubcategories,
    setFeatures,
    resetFilters,
    toggleAdvanced,
    hasActiveFilters,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
