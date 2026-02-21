# Home Page Filter System

A smart, user-centric filtering system for the sayso home page that leverages onboarding data (interests, subcategories, deal-breakers) to provide personalized filtering.

🎯 Features

# Primary Filters (Always Visible)
- **Location/Distance** - Filter by radius (1, 5, 10, 25 miles)
- **Rating** - Minimum rating filter (3.0+, 3.5+, 4.0+, 4.5+)
- **Sort By** - Relevance, Distance, Rating, Reviews, Newest, Trending

# Advanced Filters (Modal)
- **Price Range** - $, $$, $$$, $$$$
- **Open Now** - Toggle to show only currently open places
- **Must Meet Standards** - Auto-filter by user's deal-breakers from onboarding

# Smart Defaults
- Automatically uses user's interests from onboarding
- Defaults to "Near me" with 5-mile radius
- Minimum 4.0 rating
- "Meets standards" enabled by default (respects user preferences)

📁 File Structure

```
src/app/
├── types/
│   └── filters.ts              # Filter type definitions
├── contexts/
│   └── FilterContext.tsx       # Global filter state management
├── components/
│   └── Home/
│       ├── FilterBar.tsx       # Primary filter UI (sticky top bar)
│       ├── AdvancedFilters.tsx # Advanced filters modal
│       ├── FilterDemo.tsx      # Demo component
│       └── index.ts            # Exports
└── filter-demo/
    └── page.tsx                # Test page (/filter-demo)
```

🚀 Quick Start

# 1. View the Demo

Visit `/filter-demo` to see the filter system in action.

# 2. Integrate into Your Home Page

```tsx
// src/app/home/page.tsx
"use client";

import { FilterProvider, useFilters } from '@/app/contexts/FilterContext';
import { FilterBar, AdvancedFilters } from '@/app/components/Home';

function HomePageContent() {
  const { filters } = useFilters();

  // Use filter state to query your data
  const businesses = useBusinesses({
    location: filters.location,
    categories: filters.categories,
    minRating: filters.minRating,
    sortBy: filters.sortBy,
    priceRange: filters.priceRange,
    openNow: filters.openNow,
    mustMeetDealbreakers: filters.mustMeetDealbreakers,
  });

  return (
    <>
      {/* Filter Bar - Sticky top bar with primary filters */}
      <FilterBar />

      {/* Your existing content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Business listings, map, etc. */}
      </div>

      {/* Advanced Filters Modal */}
      <AdvancedFilters />
    </>
  );
}

export default function HomePage() {
  return (
    <FilterProvider>
      <HomePageContent />
    </FilterProvider>
  );
}
```

🔧 API Reference

# `useFilters()` Hook

```tsx
import { useFilters } from '@/app/contexts/FilterContext';

const {
  // Current filter state
  filters,              // FilterState object
  defaultFilters,       // Default filters based on user onboarding
  hasActiveFilters,     // Boolean - are non-default filters applied?

  // Setter functions
  setLocation,          // (location: LocationFilter) => void
  setCategories,        // (categories: string[]) => void
  setMinRating,         // (rating: number) => void
  setSortBy,            // (sort: SortOption) => void
  setPriceRange,        // (prices: PriceRange[]) => void
  setOpenNow,           // (open: boolean) => void
  setMustMeetDealbreakers, // (mustMeet: boolean) => void
  setSubcategories,     // (subcategories: string[]) => void
  setFeatures,          // (features: string[]) => void

  // Actions
  resetFilters,         // () => void - Reset to defaults
  toggleAdvanced,       // () => void - Open/close advanced filters
} = useFilters();
```

# Filter State Structure

```typescript
interface FilterState {
  // Primary filters
  location: LocationFilter;
  categories: string[];        // Interest IDs from onboarding
  minRating: number;
  sortBy: SortOption;

  // Secondary filters
  priceRange: PriceRange[];
  openNow: boolean;
  mustMeetDealbreakers: boolean;

  // Advanced
  subcategories?: string[];    // Subcategory IDs from onboarding
  features?: string[];         // Feature flags (e.g., 'outdoor_seating')

  // UI state
  isAdvancedOpen: boolean;
  activeFiltersCount: number;
}
```

# Location Filter

```typescript
interface LocationFilter {
  type: 'near_me' | 'coordinates' | 'address';
  lat?: number;
  lng?: number;
  address?: string;
  radiusMiles: 1 | 5 | 10 | 25;
}
```

🎨 Customization

# Styling

All components use:
- **Font**: Urbanist (system fallback)
- **Colors**: Sage (primary), Charcoal (text), Off-white (background)
- **Border radius**: Rounded-full for buttons, rounded-xl for cards

# Adding New Filters

1. **Update Types** (`src/app/types/filters.ts`):
```typescript
export interface HomeFilters {
  // Add your new filter
  myNewFilter: string;
}
```

2. **Update Context** (`src/app/contexts/FilterContext.tsx`):
```typescript
const setMyNewFilter = useCallback((value: string) => {
  setFilters(prev => ({ ...prev, myNewFilter: value }));
}, []);

// Add to context value
return { ...other, setMyNewFilter };
```

3. **Update UI** (FilterBar or AdvancedFilters):
```tsx
<button onClick={() => setMyNewFilter('value')}>
  My Filter
</button>
```

💾 Persistence

Filters are automatically persisted to `localStorage` under the key `home_filters`.

- Saved on every change
- Loaded on page mount
- Survives page refreshes
- User-specific (tied to browser)

🧪 Testing

# Manual Testing

1. Visit `/filter-demo`
2. Test each filter:
   - Change location radius
   - Adjust minimum rating
   - Change sort order
   - Open "More Filters" and toggle options
3. Verify filter state updates in the debug panel
4. Refresh page - filters should persist

# Integration Testing

```typescript
// Example test
import { render, screen } from '@testing-library/react';
import { FilterProvider } from '@/app/contexts/FilterContext';
import { FilterBar } from '@/app/components/Home';

test('displays filter bar', () => {
  render(
    <FilterProvider>
      <FilterBar />
    </FilterProvider>
  );

  expect(screen.getByText(/Within/)).toBeInTheDocument();
});
```

📊 Filter Strategy

# Default Behavior

When user lands on home page:
- Location: Near me, 5 miles
- Categories: User's interests from onboarding (auto-applied)
- Rating: 4.0+ minimum
- Sort: Relevance (matches user interests)
- Price: All ranges
- Open Now: Off
- Meet Standards: **ON** (respects user deal-breakers)

# Active Filters

Filters are considered "active" (non-default) when:
- Distance changed from 5 miles
- Categories manually filtered (different from all interests)
- Rating changed from 4.0
- Sort changed from relevance
- Price range limited (less than 4 options)
- Open Now enabled
- Meet Standards toggled off
- Subcategories specified
- Features specified

🔗 Integration with Backend

# Example API Query

```typescript
const queryBusinesses = async (filters: HomeFilters) => {
  const params = new URLSearchParams();

  // Location
  if (filters.location.type === 'near_me') {
    params.append('near_me', 'true');
  } else if (filters.location.lat && filters.location.lng) {
    params.append('lat', filters.location.lat.toString());
    params.append('lng', filters.location.lng.toString());
  }
  params.append('radius_miles', filters.location.radiusMiles.toString());

  // Categories
  if (filters.categories.length > 0) {
    params.append('categories', filters.categories.join(','));
  }

  // Rating
  params.append('min_rating', filters.minRating.toString());

  // Sort
  params.append('sort_by', filters.sortBy);

  // Price
  if (filters.priceRange.length < 4) {
    params.append('price_range', filters.priceRange.join(','));
  }

  // Open now
  if (filters.openNow) {
    params.append('open_now', 'true');
  }

  // Deal-breakers
  if (filters.mustMeetDealbreakers) {
    params.append('meets_standards', 'true');
  }

  const response = await fetch(`/api/businesses?${params}`);
  return response.json();
};
```

🎯 Best Practices

1. **Leverage Onboarding Data**
   - Use user interests as default categories
   - Respect user deal-breakers by default
   - Make filtering feel personalized, not generic

2. **Progressive Disclosure**
   - Show primary filters always (location, rating, sort)
   - Hide advanced filters in modal
   - Use clear labels and icons

3. **Performance**
   - Debounce filter changes if querying live
   - Cache filter results
   - Lazy load advanced filter modal

4. **Mobile First**
   - Sticky filter bar on mobile
   - Horizontal scroll for filter chips
   - Full-screen modal for advanced filters

5. **Accessibility**
   - Use semantic HTML (buttons, labels)
   - ARIA labels for icons
   - Keyboard navigation support

🐛 Troubleshooting

# Filters not persisting
- Check localStorage is enabled
- Clear localStorage: `localStorage.removeItem('home_filters')`

# Default filters not loading
- Verify user onboarding is complete
- Check `user_interests` table in database

# Modal not opening
- Ensure `FilterProvider` wraps your components
- Check `AdvancedFilters` is rendered

📝 TODO

- [ ] Add category/subcategory multi-select UI
- [ ] Implement geolocation for "Near me"
- [ ] Add filter presets (e.g., "Quick lunch", "Date night")
- [ ] Add "Recently viewed" filter
- [ ] Implement filter analytics
- [ ] Add A/B testing for default filters

🤝 Contributing

When adding new filters:
1. Update types in `filters.ts`
2. Add context methods in `FilterContext.tsx`
3. Update UI in `FilterBar.tsx` or `AdvancedFilters.tsx`
4. Document in this README
5. Add tests
