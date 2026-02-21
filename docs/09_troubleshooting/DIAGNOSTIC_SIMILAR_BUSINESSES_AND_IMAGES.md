# Diagnostic Report: Similar Business Cards & Image Updates

## Issue Summary

1. **Similar business cards are not appearing** on business profile pages
2. **Business image updates may not propagate** to similar business cards

## Investigation Findings

### 1. Similar Businesses Component Flow

**Component**: `src/app/components/SimilarBusinesses/SimilarBusinesses.tsx`

**Flow**:
1. Component receives: `currentBusinessId`, `category`, `location`, `interestId`, `subInterestId`
2. Uses `useBusinesses` hook with multiple fallback strategies:
   - Strategy 1: `category` + `location` (most relevant)
   - Strategy 2: `category` only
   - Strategy 3: `location` only
   - Strategy 4: `interestId` only
3. Filters out current business by ID/slug comparison
4. Returns `null` if `similarBusinesses.length === 0` (line 328)

**Rendering Condition** (line 328):
```typescript
if (!loading && (!similarBusinesses || similarBusinesses.length === 0)) {
  return null; // ⚠️ Component doesn't render if no results
}
```

### 2. Data Flow Analysis

#### API Endpoint: `/api/businesses`
- Uses `list_businesses_optimized` RPC function
- RPC function queries `business_images` table and aggregates URLs into `uploaded_images` array
- Transformation function `transformBusinessForCard` includes `uploaded_images` in response (line 1647)

#### SimilarBusinessCard Component
- Expects: `uploaded_images?: string[]`, `image_url?: string`, `image?: string`
- Priority: `uploaded_images[0]` > `image_url` > `image` > category PNG
- Component correctly handles image fallback chain

### 3. Potential Issues Identified

#### Issue 1: Empty Results from API
**Possible Causes**:
- No businesses match the category/location filters
- All matching businesses are filtered out (same as current business)
- RPC function returns empty results
- Query parameters don't match database values

#### Issue 2: Image Updates Not Propagating
**Possible Causes**:
- API caching (`Cache-Control` headers)
- Client-side caching in `useBusinesses` hook
- `business_images` table not being queried correctly
- `uploaded_images` array not being populated from `business_images` table

#### Issue 3: Business ID/Slug Mismatch
- Component filters by comparing `b.id === currentBusinessId` OR `b.slug === currentBusinessId`
- If `currentBusinessId` is a slug but API returns UUIDs (or vice versa), filtering might fail

## Diagnostic Steps Added

Enhanced logging has been added to help identify issues:

1. **SimilarBusinesses Component** - Logs strategy attempts, results count, filtering
2. **useBusinesses Hook** - Logs API calls, responses, skip conditions
3. **API Route** - Logs RPC calls, transformations, uploaded_images counts

## Changes Made for Diagnosis

### Enhanced Logging Added

#### 1. SimilarBusinesses Component (`src/app/components/SimilarBusinesses/SimilarBusinesses.tsx`)
- **Filtering stage**: Logs raw business count, filtered count, which businesses were filtered out (current business)
- **Final results**: Logs final similar businesses with image data (`uploaded_images` count, `image_url` presence, `image` presence)
- **Empty state logging**: Logs when no raw businesses are available with context (category, location, strategy)

#### 2. API Route (`src/app/api/businesses/route.ts`)
- **RPC call logging**: Added detailed logging before RPC call showing all parameters being passed
- **Empty results logging**: Enhanced logging when RPC returns 0 results, including all filter parameters and potential causes
- **Fallback query logging**: Added logging for fallback query method, including filters applied and results
- **Image data logging**: Added `uploadedImagesArray` (count) and `uploadedImagesSample` (first 2 URLs) to transformation logs
- Helps verify that `uploaded_images` array is populated correctly from RPC function

### Existing Logging (Already Present)
- Strategy attempts and fallbacks are already logged
- RPC function calls and responses are logged
- `useBusinesses` hook logs API calls

## Recommended Fixes

### ✅ Fix 1: Enhanced Debugging (COMPLETED)
Enhanced logging has been added to help identify:
- Whether API returns businesses
- Whether filtering correctly excludes current business
- Whether `uploaded_images` array is populated
- Image data availability in transformed businesses

### Fix 2: Verify Image Updates Trigger Refetch
- ✅ `useBusinesses` hook already listens to `businessUpdateEvents` (line 246-264 in `useBusinesses.ts`)
- ✅ Image upload handlers emit `notifyBusinessUpdated` events:
  - Business edit page: Line 317 in `src/app/business/[id]/edit/page.tsx`
  - Owner dashboard: Line 336 in `src/app/owners/businesses/[id]/page.tsx`
- **Action Required**: Verify events are being emitted and received correctly

### Fix 3: Verify RPC Function
- ✅ RPC function `list_businesses_optimized` queries `business_images` table (lines 88-96 in migration)
- ✅ Creates `uploaded_images` array from `business_images` table
- **Action Required**: Verify RPC function exists and returns data in test environment

### Fix 4: Component Rendering
- Component returns `null` if no results (line 328)
- This is expected behavior (doesn't render empty section)
- **Consideration**: If debugging shows businesses exist but aren't rendering, check filtering logic

## Diagnostic Checklist

### Step 1: Check Browser Console
1. Open browser DevTools Console
2. Navigate to a business profile page
3. Look for `[SimilarBusinesses]` logs:
   - `Props changed` - Confirms component is mounting
   - `Filtering businesses` - Shows raw businesses received
   - `After filtering` - Shows how many were filtered out
   - `Final similar businesses` - Shows final results with image data
   - `Strategy check` - Shows which search strategy is being used
   - `All strategies exhausted` - Indicates no businesses found after all fallbacks

### Step 2: Check Server Logs
1. Open Next.js dev server terminal (⚠️ **IMPORTANT**: API logs appear in SERVER terminal, not browser console)
2. Look for `[BUSINESSES API]` logs:
   - `🔍 [BUSINESSES API] Calling RPC with params:` - Shows exact parameters being passed to RPC
   - `RPC params:` - JSON object showing all filter parameters (category, location, sortBy, etc.)
   - `✅ [BUSINESSES API] RPC returned X businesses` - Confirms API is returning data
   - `⚠️  [BUSINESSES API] RPC returned 0 businesses (empty result)` - Shows when no results are found
   - `Query filters:` - Detailed breakdown of all filters when 0 results are returned
   - `🔄 [BUSINESSES API] Using fallback query method` - Indicates RPC failed, using fallback
   - `Fallback query filters:` - Shows filters used in fallback query
   - `Fallback query result:` - Shows fallback query results
   - `transformBusinessForCard: Successfully transformed` - Shows image data in transformed businesses
   - `uploadedImagesArray` - Shows count of images in array
   - `uploadedImagesSample` - Shows first 2 image URLs

### Step 3: Verify Database State
1. Check if businesses exist with matching `category` and `location`
2. Verify `business_images` table has data for those businesses
3. Confirm `business_images.url` values are valid URLs

### Step 4: Test Image Updates
1. Update a business image via edit page
2. Check console for `notifyBusinessUpdated` event
3. Verify `useBusinesses` hook receives event and refetches
4. Check if updated images appear in similar business cards

### Step 5: Verify RPC Function
1. Test RPC function directly in database:
   ```sql
   SELECT * FROM list_businesses_optimized(
     5, -- limit
     NULL, -- cursor_id
     NULL, -- cursor_created_at
     'Restaurant', -- category (example)
     'Cape Town', -- location (example)
     NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
   );
   ```
2. Verify `uploaded_images` array is populated in results

## Expected Console Output (Success Case)

```
[SimilarBusinesses] Props changed, resetting strategy
[SimilarBusinesses] Filtering businesses { rawCount: 4, currentBusinessId: "...", ... }
[SimilarBusinesses] After filtering { filteredCount: 3, filteredOutCount: 1, ... }
[SimilarBusinesses] Final similar businesses { count: 3, businesses: [...] }
[SimilarBusinesses] ✓ Success! Found similar businesses: { count: 3, ... }
```

## Expected Console Output (No Results Case)

```
[SimilarBusinesses] Strategy check: { strategy: 'both', rawBusinessesCount: 0, ... }
[SimilarBusinesses] ⚠ No results with category+location, falling back to category only
[SimilarBusinesses] Strategy check: { strategy: 'category', rawBusinessesCount: 0, ... }
[SimilarBusinesses] ✗ All strategies exhausted. No similar businesses found.
```

## Next Steps

1. ✅ Enhanced logging has been added
2. ⏳ **Run the application and check console logs** (user action required)
3. ⏳ **Review server logs for API responses** (user action required)
4. ⏳ **Verify database state** (user action required)
5. ⏳ **Test image updates** (user action required)

## Files Modified

1. `src/app/components/SimilarBusinesses/SimilarBusinesses.tsx`
   - Added detailed logging in filtering logic
   - Added logging for final results with image data

2. `src/app/api/businesses/route.ts`
   - Enhanced transformation logging with image data details

3. `docs/DIAGNOSTIC_SIMILAR_BUSINESSES_AND_IMAGES.md` (this file)
   - Comprehensive diagnostic guide

