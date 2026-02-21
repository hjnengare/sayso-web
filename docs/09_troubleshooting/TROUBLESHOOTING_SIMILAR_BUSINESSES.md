# Troubleshooting: Similar Businesses Returning 0 Results

## Issue
Similar business cards are not appearing because the API is returning 0 businesses.

## Current Query Parameters
- **Category**: `Veterinary`
- **Location**: `Cape Town`
- **Current Business ID**: `8aaefe92-3420-47f2-a205-08b6a9371f33`

## Diagnostic Steps

### Step 1: Check Server Terminal Logs
⚠️ **CRITICAL**: API logs appear in the **Next.js dev server terminal**, NOT the browser console!

Look for these logs in your server terminal:
1. `🔍 [BUSINESSES API] Calling RPC with params:`
2. `RPC params:` - Shows all parameters being passed
3. `⚠️  [BUSINESSES API] RPC returned 0 businesses (empty result)`
4. `Query filters:` - Shows all filter parameters

### Step 2: Verify Database State

Run these SQL queries in your Supabase SQL Editor to check if businesses exist:

#### Query 1: Check if any businesses exist with category 'Veterinary' (case-insensitive)
```sql
SELECT 
  id, 
  name, 
  category, 
  location, 
  status,
  LOWER(category) as category_lower
FROM businesses 
WHERE LOWER(category) LIKE '%veterinary%' 
  AND status = 'active'
LIMIT 10;
```

#### Query 2: Check if any businesses exist in 'Cape Town' (case-insensitive)
```sql
SELECT 
  id, 
  name, 
  category, 
  location, 
  status,
  LOWER(location) as location_lower
FROM businesses 
WHERE LOWER(location) LIKE '%cape town%' 
  AND status = 'active'
LIMIT 10;
```

#### Query 3: Check if any businesses match BOTH category and location
```sql
SELECT 
  id, 
  name, 
  category, 
  location, 
  status
FROM businesses 
WHERE LOWER(category) LIKE '%veterinary%' 
  AND LOWER(location) LIKE '%cape town%'
  AND status = 'active'
LIMIT 10;
```

#### Query 4: Test the RPC function directly
```sql
SELECT * FROM list_businesses_optimized(
  5,              -- p_limit
  NULL,           -- p_cursor_id
  NULL,           -- p_cursor_created_at
  'Veterinary',   -- p_category
  'Cape Town',    -- p_location
  NULL,           -- p_verified
  NULL,           -- p_price_range
  NULL,           -- p_badge
  NULL,           -- p_min_rating
  NULL,           -- p_search
  NULL,           -- p_latitude
  NULL,           -- p_longitude
  NULL,           -- p_radius_km
  'total_rating', -- p_sort_by
  'desc'          -- p_sort_order
);
```

#### Query 5: Check ALL distinct categories in the database
```sql
SELECT DISTINCT category, COUNT(*) as count
FROM businesses
WHERE status = 'active'
GROUP BY category
ORDER BY count DESC;
```

#### Query 6: Check ALL distinct locations (first 50)
```sql
SELECT DISTINCT location, COUNT(*) as count
FROM businesses
WHERE status = 'active'
GROUP BY location
ORDER BY count DESC
LIMIT 50;
```

### Step 3: Potential Issues and Fixes

#### Issue 1: Category Case Mismatch
**Symptom**: Database has 'veterinary' (lowercase) but query searches for 'Veterinary' (capitalized)

**Fix**: The RPC function uses `ILIKE` which should handle this, but verify the actual category value in the database.

#### Issue 2: Category Value Mismatch
**Symptom**: Database might have 'Veterinarian' or 'Vet Services' instead of 'Veterinary'

**Fix**: Check Query 1 above to see what category values actually exist.

#### Issue 3: Location Value Mismatch
**Symptom**: Database might have 'CapeTown' (no space) or 'Cape-Town' (hyphen) instead of 'Cape Town'

**Fix**: The RPC function uses `ILIKE '%' || p_location || '%'` which should handle partial matches, but verify the actual location values.

#### Issue 4: No Businesses Match
**Symptom**: There simply aren't any businesses with that category and location combination

**Fix**: This is expected behavior - if no businesses match, the API correctly returns 0 results.

#### Issue 5: RLS Policies Blocking Results
**Symptom**: Businesses exist but RLS policies prevent them from being returned

**Fix**: Check RLS policies on the `businesses` table. The API logs should show a warning if RLS is blocking reads.

### Step 4: Fix the RPC Function (If Needed)

If the queries above show that businesses exist but the RPC function returns 0 results, the issue might be with the RPC function's matching logic.

The current RPC function uses:
```sql
AND (p_category IS NULL OR b.category ILIKE p_category)
AND (p_location IS NULL OR b.location ILIKE '%' || p_location || '%')
```

This should work, but if you want more explicit matching, you could modify it to:
```sql
AND (p_category IS NULL OR LOWER(b.category) = LOWER(p_category))
AND (p_location IS NULL OR LOWER(b.location) LIKE '%' || LOWER(p_location) || '%')
```

However, **don't modify the RPC function** until you've verified:
1. Businesses exist in the database with matching criteria
2. The RPC function is being called correctly
3. RLS policies are not blocking results

## Next Steps

1. ✅ Check server terminal logs (from Step 1)
2. ✅ Run SQL diagnostic queries (from Step 2)
3. ⏳ Share the results so we can identify the root cause
4. ⏳ Apply the appropriate fix based on findings

## Expected Behavior

If businesses exist with matching criteria:
- API should return businesses (even if filtered down to 0 after excluding current business)
- Similar businesses component should render cards

If no businesses match:
- API correctly returns 0 businesses
- Similar businesses component correctly returns `null` (doesn't render)

