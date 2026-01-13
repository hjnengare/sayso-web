/**
 * Home Page Filter Types
 * Defines the structure for filtering businesses/places
 */

export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

export type SortOption =
  | 'relevance'    // Matches user interests (default)
  | 'distance'     // Closest first
  | 'rating'       // Highest rated first
  | 'reviews'      // Most reviewed
  | 'newest'       // Recently added
  | 'trending';    // Popular now

export type DistanceOption = 1 | 5 | 10 | 25; // miles

export interface LocationFilter {
  type: 'near_me' | 'coordinates' | 'address';
  lat?: number;
  lng?: number;
  address?: string;
  radiusMiles: DistanceOption;
}

export interface HomeFilters {
  // Primary filters
  location: LocationFilter;
  categories: string[]; // Interest IDs from onboarding
  minRating: number;
  sortBy: SortOption;

  // Secondary filters
  priceRange: PriceRange[];
  openNow: boolean;
  mustMeetDealbreakers: boolean; // Auto-filter by user's deal-breakers

  // Advanced filters
  subcategories?: string[]; // Subcategory IDs from onboarding
  features?: string[]; // outdoor_seating, delivery, etc.

  // Quick filters (derived state, not stored)
  quickFilter?: 'popular' | 'hidden_gems' | 'recent' | 'verified';
}

export interface FilterState extends HomeFilters {
  // UI state
  isAdvancedOpen: boolean;
  activeFiltersCount: number; // Number of non-default filters applied
}

// Default filter values based on user's onboarding
export const getDefaultFilters = (userInterests?: string[]): HomeFilters => ({
  location: {
    type: 'near_me',
    radiusMiles: 5,
  },
  categories: userInterests || [],
  minRating: 4.0,
  sortBy: 'relevance',
  priceRange: ['$', '$$', '$$$', '$$$$'], // All price ranges by default
  openNow: false,
  mustMeetDealbreakers: true, // Default to ON - respect user preferences
  subcategories: [],
  features: [],
});

// Helper to count active non-default filters
export const countActiveFilters = (filters: HomeFilters, defaults: HomeFilters): number => {
  let count = 0;

  // Location radius changed
  if (filters.location.radiusMiles !== defaults.location.radiusMiles) count++;

  // Categories filtered (less than all interests)
  if (filters.categories.length > 0 &&
      filters.categories.length !== defaults.categories.length) count++;

  // Rating filter changed
  if (filters.minRating !== defaults.minRating) count++;

  // Sort changed from default
  if (filters.sortBy !== defaults.sortBy) count++;

  // Price range filtered (less than all)
  if (filters.priceRange.length < 4) count++;

  // Open now enabled
  if (filters.openNow) count++;

  // Deal-breakers filter changed
  if (filters.mustMeetDealbreakers !== defaults.mustMeetDealbreakers) count++;

  // Subcategories specified
  if (filters.subcategories && filters.subcategories.length > 0) count++;

  // Features specified
  if (filters.features && filters.features.length > 0) count++;

  return count;
};

// Filter chip labels for display
export const getFilterLabel = (key: keyof HomeFilters, value: any): string => {
  switch (key) {
    case 'location':
      return `${value.radiusMiles} mi`;
    case 'minRating':
      return `${value}+ ⭐`;
    case 'priceRange':
      return value.join('');
    case 'openNow':
      return 'Open Now';
    case 'mustMeetDealbreakers':
      return 'Meets Standards';
    case 'sortBy':
      return value === 'relevance' ? 'For You' :
             value === 'distance' ? 'Nearby' :
             value === 'rating' ? 'Top Rated' :
             value === 'reviews' ? 'Popular' :
             value === 'newest' ? 'New' : 'Trending';
    default:
      return String(value);
  }
};
