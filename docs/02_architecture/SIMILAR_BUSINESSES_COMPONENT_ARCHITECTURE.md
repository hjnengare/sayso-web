# Similar Businesses Component Architecture

## Overview
The similar businesses feature consists of a component hierarchy that fetches, filters, and displays related businesses on a business profile page.

## Component Hierarchy

```
BusinessProfilePage (src/app/business/[id]/page.tsx)
  └── SimilarBusinesses (src/app/components/SimilarBusinesses/SimilarBusinesses.tsx)
      └── SimilarBusinessCard[] (src/app/components/SimilarBusinesses/SimilarBusinessCard.tsx)
          └── (wrapped in StaggeredContainer & AnimatedElement for animations)
```

## Core Components

### 1. **SimilarBusinesses** (`src/app/components/SimilarBusinesses/SimilarBusinesses.tsx`)
**Main container component** that orchestrates the similar businesses feature.

**Responsibilities:**
- ✅ Fetches similar businesses using the `useBusinesses` hook
- ✅ Implements multiple search strategies with fallbacks:
  - Strategy 1: `category` + `location` (most relevant)
  - Strategy 2: `category` only
  - Strategy 3: `location` only  
  - Strategy 4: `interestId` only (sibling categories/subcategories)
- ✅ Filters out the current business (by ID or slug)
- ✅ Applies personalization based on user preferences
- ✅ Removes duplicates
- ✅ Renders loading skeletons while fetching
- ✅ Returns `null` if no results found (doesn't render empty section)

**Props:**
```typescript
interface SimilarBusinessesProps {
  currentBusinessId: string;    // ID of the current business (to exclude)
  category: string;              // Business category for filtering
  location?: string;             // Business location for filtering
  interestId?: string | null;    // Interest ID for fallback strategy
  subInterestId?: string | null; // Sub-interest ID for fallback strategy
  limit?: number;                // Maximum number of businesses to show (default: 3)
}
```

**Key Dependencies:**
- `useBusinesses` hook - Fetches businesses from API
- `useUserPreferences` hook - Gets user preferences for personalization
- `SimilarBusinessCard` - Child component for rendering individual cards
- `StaggeredContainer` & `AnimatedElement` - Animation wrappers
- `WavyTypedTitle` - Animated title component

---

### 2. **SimilarBusinessCard** (`src/app/components/SimilarBusinesses/SimilarBusinessCard.tsx`)
**Individual business card component** that displays a single similar business.

**Responsibilities:**
- ✅ Renders business image with fallback chain:
  1. `uploaded_images[0]` (first uploaded image)
  2. `image_url` (legacy image URL)
  3. `image` (alternate image prop)
  4. Category PNG icon (fallback)
- ✅ Displays business name, category, location
- ✅ Shows rating and review count (if available)
- ✅ Handles click navigation to business profile page
- ✅ Supports compact mode for different layouts
- ✅ Implements Instagram-style blurred background effect for images

**Props:**
```typescript
interface SimilarBusinessCardProps {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  image_url?: string;
  uploaded_images?: string[];    // Array of uploaded image URLs
  category: string;
  location: string;
  address?: string;
  description?: string;
  rating?: number;
  totalRating?: number;
  reviews?: number;
  total_reviews?: number;
  verified?: boolean;
  priceRange?: string;
  price_range?: string;
  compact?: boolean;
}
```

**Key Features:**
- Image priority: `uploaded_images[0]` > `image_url` > `image` > category PNG
- SEO-friendly URLs using slug when available
- Keyboard navigation support (Enter/Space to navigate)
- Responsive design with mobile/desktop breakpoints

---

## Supporting Components & Hooks

### 3. **useBusinesses Hook** (`src/app/hooks/useBusinesses.ts`)
**Data fetching hook** that retrieves businesses from the API.

**Responsibilities:**
- ✅ Calls `/api/businesses` endpoint with filters
- ✅ Handles loading and error states
- ✅ Listens to `businessUpdateEvents` for real-time updates
- ✅ Supports various filter parameters (category, location, interestIds, etc.)
- ✅ Caches results and refetches on demand

**Used by:** `SimilarBusinesses` component

---

### 4. **useUserPreferences Hook** (`src/app/hooks/useUserPreferences.ts`)
**User preferences hook** for personalization.

**Responsibilities:**
- ✅ Fetches user interests, subcategories, and dealbreakers
- ✅ Provides data for personalization scoring

**Used by:** `SimilarBusinesses` component for personalization

---

## Integration Point

### 5. **BusinessProfilePage** (`src/app/business/[id]/page.tsx`)
**Parent page component** that renders the business profile and includes similar businesses.

**Integration:**
```typescript
<SimilarBusinesses
  currentBusinessId={businessId}
  category={businessData.category}
  location={businessData.location}
  interestId={business?.interest_id || business?.interestId}
  subInterestId={business?.sub_interest_id || business?.subInterestId}
  limit={3}
/>
```

**Location:** Rendered after the reviews section, at the bottom of the business profile page (line 629).

---

## Data Flow

```
1. BusinessProfilePage passes props to SimilarBusinesses
   ↓
2. SimilarBusinesses calls useBusinesses hook with filters
   ↓
3. useBusinesses fetches from /api/businesses endpoint
   ↓
4. API queries database (via RPC function list_businesses_optimized)
   ↓
5. API returns businesses array
   ↓
6. SimilarBusinesses filters out current business
   ↓
7. SimilarBusinesses applies personalization (if user has preferences)
   ↓
8. SimilarBusinesses maps businesses to SimilarBusinessCard components
   ↓
9. SimilarBusinessCard renders individual business cards
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/components/SimilarBusinesses/SimilarBusinesses.tsx` | Main container component |
| `src/app/components/SimilarBusinesses/SimilarBusinessCard.tsx` | Individual card component |
| `src/app/hooks/useBusinesses.ts` | Data fetching hook |
| `src/app/hooks/useUserPreferences.ts` | User preferences hook |
| `src/app/business/[id]/page.tsx` | Integration point (parent page) |
| `src/app/api/businesses/route.ts` | API endpoint for fetching businesses |
| `supabase/migrations/20250120_update_list_businesses_optimized_for_business_images.sql` | RPC function for database queries |

## Animation Components

The similar businesses section uses animation components for enhanced UX:

- **StaggeredContainer** - Wraps the list and provides staggered animation timing
- **AnimatedElement** - Wraps each card with entrance animations
- **WavyTypedTitle** - Animated title "You Might Also Like"

---

## Image Display Logic

The image display follows this priority chain:

1. **uploaded_images[0]** - First image from `business_images` table (preferred)
2. **image_url** - Legacy image URL from `businesses.image_url`
3. **image** - Alternate image prop
4. **Category PNG** - Fallback icon based on business category

This ensures uploaded images (from `business_images` table) are prioritized over legacy image URLs.

