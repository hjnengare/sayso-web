# Business Logic Edge Cases

This document outlines all identified edge cases, potential issues, and boundary conditions in the business-related functionality.

## 1. Business Creation Edge Cases

### 1.1 Slug Generation Infinite Loop
**Location:** `src/app/api/businesses/route.ts:1518-1530`

**Issue:** The slug generation uses a `while (true)` loop without a maximum iteration limit. If there are many businesses with similar names, this could theoretically run indefinitely.

**Current Code:**
```typescript
while (true) {
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', finalSlug)
    .single();

  if (!existing) {
    break; // Slug is unique
  }
  finalSlug = `${slug}-${slugSuffix}`;
  slugSuffix++;
}
```

**Risk:** High - Could cause API timeout or infinite loop
**Mitigation Needed:** Add maximum iteration limit (e.g., 1000) and fallback to UUID-based slug

### 1.2 Empty/Null Name After Trim
**Location:** `src/app/api/businesses/route.ts:1496-1500`

**Issue:** Validation checks `!name` but doesn't check if name becomes empty after `.trim()`. A business could be created with only whitespace.

**Current Code:**
```typescript
if (!name || !category || !location) {
  return NextResponse.json(
    { error: 'Name, category, and location are required' },
    { status: 400 }
  );
}
```

**Risk:** Medium - Could create businesses with empty names
**Mitigation Needed:** Validate `name.trim().length > 0`

### 1.3 Business Owner Entry Creation Failure
**Location:** `src/app/api/businesses/route.ts:1566-1584`

**Issue:** If business is created but `business_owners` entry fails, the code attempts cleanup by deleting the business. However, if the business has already been referenced (e.g., in saved_businesses), this could fail or leave orphaned references.

**Current Code:**
```typescript
if (ownerError) {
  // Business was created but owner entry failed - try to clean up
  await supabase.from('businesses').delete().eq('id', newBusiness.id);
  return NextResponse.json(
    { error: 'Failed to assign ownership', details: ownerError.message },
    { status: 500 }
  );
}
```

**Risk:** Medium - Partial data creation, potential orphaned records
**Mitigation:** Use database transaction to ensure atomicity

### 1.4 Business Stats Initialization Failure
**Location:** `src/app/api/businesses/route.ts:1586-1593`

**Issue:** Business stats initialization is not checked for errors. If it fails, the business is created but stats are missing.

**Current Code:**
```typescript
await supabase.from('business_stats').insert({
  business_id: newBusiness.id,
  total_reviews: 0,
  average_rating: 0.0,
  rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  percentiles: {},
});
```

**Risk:** Low - Stats can be recalculated, but should be logged
**Mitigation:** Add error handling and logging

### 1.5 Location Validation for Online-Only Businesses
**Location:** `src/app/add-business/page.tsx:444-447`

**Issue:** Frontend validation requires location for physical and service-area businesses, but the API requires location for ALL businesses. Online-only businesses shouldn't require location.

**Current Code:**
```typescript
if (formData.businessType !== 'online-only') {
  fieldsToValidate.push("location");
}
```

**Risk:** Medium - Inconsistency between frontend and backend validation
**Mitigation:** Align API validation with frontend logic

## 2. Business Ownership Edge Cases

### 2.1 Duplicate Ownership Claims
**Location:** `src/app/api/business/claim/route.ts:38-51`

**Issue:** Checks for existing ownership but doesn't handle race conditions. Two users could simultaneously claim the same business.

**Current Code:**
```typescript
const { data: existingOwner } = await supabase
  .from('business_owners')
  .select('id')
  .eq('business_id', business_id)
  .eq('user_id', user.id)
  .single();
```

**Risk:** Medium - Race condition could allow duplicate claims
**Mitigation:** Use database unique constraint and handle constraint violations

### 2.2 Pending Request Duplicates
**Location:** `src/app/api/business/claim/route.ts:53-67`

**Issue:** Checks for pending requests but doesn't prevent concurrent requests from the same user.

**Risk:** Medium - Multiple pending requests could be created
**Mitigation:** Use database unique constraint on `(business_id, user_id, status)` where status='pending'

### 2.3 Owner Deletion Leaves Business Orphaned
**Location:** `src/app/lib/migrations/002_business/001_businesses-schema.sql:21`

**Issue:** `owner_id` uses `ON DELETE SET NULL`, which means if the owner account is deleted, the business becomes ownerless. However, `business_owners` table might still have records.

**Current Schema:**
```sql
owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
```

**Risk:** Low - Business remains but ownership records might be inconsistent
**Mitigation:** Ensure `business_owners` table also handles owner deletion properly

## 3. Business Deletion Edge Cases

### 3.1 No DELETE Endpoint
**Location:** `src/app/api/businesses/[id]/route.ts`

**Issue:** There is no DELETE endpoint for businesses. RLS policies allow deletion (`businesses_delete_owner`), but there's no API route to handle it.

**Risk:** High - Business owners cannot delete their businesses through the API
**Mitigation Needed:** Implement DELETE endpoint with proper cascade handling

### 3.2 Cascade Delete Dependencies
**Location:** Various migration files

**Issue:** When a business is deleted, the following should cascade:
- `business_stats` (ON DELETE CASCADE)
- `reviews` → `review_images` (cascade)
- `saved_businesses` (should cascade)
- `business_owners` (should cascade)
- `business_ownership_requests` (should cascade)

**Risk:** High - Orphaned records if cascade not properly configured
**Mitigation:** Verify all foreign keys have proper CASCADE behavior

### 3.3 Business Images Not Deleted
**Location:** No cleanup code found

**Issue:** When a business is deleted, uploaded images in storage are not removed.

**Risk:** Medium - Storage bloat over time
**Mitigation Needed:** Delete images from storage before/after business deletion

## 4. Business Update Edge Cases

### 4.1 Slug Not Updated on Name Change
**Location:** `src/app/api/businesses/[id]/route.ts:305-399`

**Issue:** When business name is updated, the slug is not regenerated. This could lead to SEO issues or broken links if the slug was based on the old name.

**Risk:** Medium - SEO and URL consistency issues
**Mitigation:** Regenerate slug when name changes, or keep slug immutable

### 4.2 Partial Update Validation
**Location:** `src/app/api/businesses/[id]/route.ts:353-370`

**Issue:** Updates only validate fields that are provided. Invalid data in optional fields could be saved.

**Current Code:**
```typescript
if (name !== undefined) updateData.name = name;
```

**Risk:** Low - Frontend validation should catch this, but API should also validate
**Mitigation:** Add validation for each field when provided

### 4.3 Owner Verification on Update
**Location:** `src/app/api/businesses/[id]/route.ts:323-336`

**Issue:** Only checks `business_owners` table, not the legacy `owner_id` field. If a business has `owner_id` set but no `business_owners` entry, update will fail.

**Risk:** Low - Legacy data inconsistency
**Mitigation:** Check both `owner_id` and `business_owners` table

## 5. Business Stats Edge Cases

### 5.1 Race Condition in Stats Updates
**Location:** `src/app/api/reviews/route.ts:268-296`

**Issue:** Multiple reviews could be created simultaneously, causing concurrent stats updates. The retry logic helps but doesn't prevent race conditions.

**Current Code:**
```typescript
for (let attempt = 0; attempt < 3; attempt++) {
  const { error: statsUpdateError } = await supabase.rpc('update_business_stats', {
    p_business_id: business_id
  });
  // ...
}
```

**Risk:** Medium - Stats could be slightly inaccurate during high concurrency
**Mitigation:** Database function uses `ON CONFLICT DO UPDATE` which helps, but consider locking

### 5.2 Stats Update Failure Silent
**Location:** `src/app/api/reviews/route.ts:292-296`

**Issue:** If stats update fails after 3 retries, the error is only logged. The review is still created, but stats remain stale.

**Current Code:**
```typescript
if (!statsUpdateSuccess) {
  console.error('Error updating business stats via RPC after retries:', statsError);
  // Log but don't fail the request
}
```

**Risk:** Low - Stats can be recalculated, but users see stale data
**Mitigation:** Consider queuing failed stats updates for background processing

### 5.3 Missing Business Stats
**Location:** `src/app/api/businesses/[id]/route.ts:33-36`

**Issue:** If `business_stats` doesn't exist for a business, the code defaults to undefined. Frontend might not handle this gracefully.

**Current Code:**
```typescript
stats: stats || undefined,
```

**Risk:** Low - Frontend should handle missing stats, but should verify
**Mitigation:** Ensure frontend has proper null checks

## 6. Business Search/Query Edge Cases

### 6.1 Slug vs ID Lookup
**Location:** `src/app/api/businesses/[id]/route.ts:107-120`

**Issue:** API tries slug first, then ID. If a business ID happens to match a slug format, it could return the wrong business.

**Current Code:**
```typescript
const { data: slugData, error: slugError } = await supabase
  .from('businesses')
  .select('id')
  .eq('slug', businessId)
  .single();

if (slugData && slugData.id) {
  actualBusinessId = slugData.id;
}
```

**Risk:** Low - UUIDs are unlikely to match slug format, but should verify
**Mitigation:** Check if `businessId` is a valid UUID format before trying slug lookup

### 6.2 Empty Search Results
**Location:** Various search endpoints

**Issue:** No explicit handling for empty search results. Should return empty array vs null vs error.

**Risk:** Low - Should be handled consistently
**Mitigation:** Ensure all search endpoints return empty arrays, not null

## 7. Business Images Edge Cases

### 7.1 Image URL Validation
**Location:** `src/app/api/businesses/[id]/route.ts:274-284`

**Issue:** Constructs image array from `uploaded_image` and `image_url` but doesn't validate URLs are accessible or valid.

**Current Code:**
```typescript
images: (() => {
  const imageList: string[] = [];
  if (business.uploaded_image && business.uploaded_image.trim() !== '') {
    imageList.push(business.uploaded_image);
  }
  // ...
})()
```

**Risk:** Low - Invalid URLs would just fail to load in frontend
**Mitigation:** Consider validating URLs or checking storage existence

### 7.2 Image Storage Path Parsing
**Location:** `src/app/lib/services/reviewService.ts:250-257`

**Issue:** Parses image URL by splitting on `/` and taking last segment. This could fail if URL format changes.

**Current Code:**
```typescript
const filePath = image.image_url.split('/').pop();
```

**Risk:** Medium - Fragile parsing logic
**Mitigation:** Use proper URL parsing or store storage path separately

## 8. Business Validation Edge Cases

### 8.1 Coordinate Validation
**Location:** `src/app/add-business/page.tsx:414-421`

**Issue:** Validates lat/lng ranges but allows empty strings. Empty strings pass validation but could cause issues when parsed.

**Current Code:**
```typescript
if (value && (isNaN(Number(value)) || Number(value) < -90 || Number(value) > 90)) {
  error = "Latitude must be between -90 and 90";
}
```

**Risk:** Low - Empty strings are handled, but should be explicit
**Mitigation:** Explicitly check for empty strings before validation

### 8.2 Phone Number Validation
**Location:** `src/app/add-business/page.tsx:402-406`

**Issue:** Phone validation uses regex but doesn't handle international formats consistently.

**Risk:** Low - Basic validation exists
**Mitigation:** Consider using a phone validation library for international formats

### 8.3 Website URL Validation
**Location:** `src/app/add-business/page.tsx:390-395`

**Issue:** URL validation doesn't check if URL is accessible or if it's a valid domain.

**Risk:** Low - Basic format validation exists
**Mitigation:** Consider additional validation for domain existence

## 9. Business Claim/Verification Edge Cases

### 9.1 Email Verification Failure
**Location:** `src/app/api/business/claim/route.ts:114-125`

**Issue:** Email sending failure doesn't fail the claim request. User gets a pending request but no confirmation email.

**Current Code:**
```typescript
EmailService.sendClaimReceivedEmail({...}).catch((error) => {
  // Log but don't fail the request if email fails
  console.error('Failed to send claim received email:', error);
});
```

**Risk:** Low - User experience issue, not functional
**Mitigation:** Consider retry logic or queue for email sending

### 9.2 Business Not Found During Claim
**Location:** `src/app/api/business/claim/route.ts:99-103`

**Issue:** Fetches business details for email, but if business doesn't exist, email still attempts to send with undefined data.

**Risk:** Low - Email service should handle undefined gracefully
**Mitigation:** Add null check before sending email

## 10. Geocoding Edge Cases (New Feature)

### 10.1 Geocoding API Failure
**Location:** `src/app/api/geocode/route.ts`

**Issue:** If both Google Maps and OpenStreetMap fail, no fallback. User cannot proceed with address entry.

**Risk:** Medium - Feature becomes unusable if APIs are down
**Mitigation:** Allow manual coordinate entry as fallback

### 10.2 Invalid Address Format
**Location:** `src/app/api/geocode/route.ts`

**Issue:** No validation of address format before geocoding. Could waste API calls on obviously invalid addresses.

**Risk:** Low - API will return error, but should validate first
**Mitigation:** Add basic address format validation

### 10.3 Mapbox Token Missing
**Location:** `src/app/components/AddBusiness/LocationPicker.tsx:28-32`

**Issue:** If Mapbox token is missing, map picker silently fails. User sees empty map.

**Risk:** Medium - Feature doesn't work, but no clear error message
**Mitigation:** Show error message if token is missing

## 11. Data Consistency Edge Cases

### 11.1 Business Stats Not Initialized
**Location:** `src/app/api/businesses/route.ts:1586-1593`

**Issue:** If stats initialization fails silently, business exists but has no stats record. Queries expecting stats will fail or return null.

**Risk:** Medium - Could cause frontend errors
**Mitigation:** Ensure stats are always initialized, or handle missing stats gracefully

### 11.2 Owner ID vs Business Owners Table
**Location:** Multiple locations

**Issue:** Two ownership systems exist: legacy `owner_id` field and new `business_owners` table. Data could be inconsistent.

**Risk:** Medium - Confusion about which system to use
**Mitigation:** Migrate all businesses to use `business_owners` table exclusively

## 12. Performance Edge Cases

### 12.1 Large Business Lists
**Location:** Various GET endpoints

**Issue:** No pagination on business list endpoints. Could return thousands of businesses.

**Risk:** Medium - Performance degradation with large datasets
**Mitigation:** Implement pagination or limit results

### 12.2 N+1 Query Problem
**Location:** `src/app/api/businesses/[id]/route.ts:168-220`

**Issue:** Fetches reviews, then fetches images and profiles separately. Could be optimized with joins.

**Risk:** Low - Already using parallel queries, but could be better
**Mitigation:** Consider using database joins instead of multiple queries

## Recommendations

### High Priority
1. **Add DELETE endpoint for businesses** with proper cascade handling
2. **Fix slug generation infinite loop** with maximum iteration limit
3. **Add transaction support** for business creation to ensure atomicity
4. **Implement proper image cleanup** when businesses are deleted

### Medium Priority
1. **Add validation** for trimmed empty strings
2. **Handle race conditions** in ownership claims with database constraints
3. **Regenerate slugs** when business names change (or make slugs immutable)
4. **Add error handling** for missing Mapbox token in location picker

### Low Priority
1. **Improve phone/URL validation** with specialized libraries
2. **Add pagination** to business list endpoints
3. **Optimize queries** to reduce N+1 problems
4. **Add background job queue** for failed stats updates

