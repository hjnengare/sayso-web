# Business Schema Verification

## Current Database Schema

The `businesses` table should have:
- ✅ `uploaded_images TEXT[]` - Array of image URLs (PRIMARY SOURCE)
- ❌ `uploaded_image TEXT` - **DEPRECATED** - Should be removed or ignored

## Migration Status

### ✅ Applied Migrations
1. `20250113_remove_business_images_table.sql` - Adds `uploaded_images TEXT[]`
2. `20250117_fix_list_businesses_optimized_uploaded_image.sql` - Updates RPC function to use `uploaded_images`

### ⚠️ Required Action
**Apply the migration if not already applied:**
```bash
# Check if migration has been applied
# Run in Supabase SQL Editor or via CLI
```

## Code Verification Checklist

### ✅ API Routes
- [x] `src/app/api/businesses/route.ts` - Uses `uploaded_images: string[] | null`
- [x] `src/app/api/reviews/route.ts` - Selects `uploaded_images` (not `uploaded_image`)
- [x] `src/app/api/user/saved/route.ts` - Uses `uploaded_images[0]` for image fallback
- [x] `src/app/api/businesses/[id]/images/route.ts` - Works with `uploaded_images` array

### ✅ Components
- [x] `BusinessCard` - Uses `uploaded_images[0]` as primary image source
- [x] `SimilarBusinessCard` - Uses `uploaded_images` array
- [x] `BusinessOfTheMonthCard` - Uses `uploaded_images[0]`
- [x] `SearchResultsMap` - Interface uses `uploaded_images`
- [x] `SavedBusinessRow` - Checks `uploaded_images` array

### ✅ TypeScript Interfaces
- [x] `BusinessRPCResult` - Has `uploaded_images: string[] | null`
- [x] `DatabaseBusinessRow` - Has `uploaded_images: string[] | null`
- [x] `Business` type in `BusinessCard` - Has `uploaded_images?: string[]`

### ✅ RPC Functions
- [x] `list_businesses_optimized` - Returns `uploaded_images TEXT[]`
- [x] `append_business_images` - Works with `uploaded_images` array

## Current Issues from Console Logs

1. **`/api/interests` failing** - Has fallback, shouldn't block business cards
2. **Service worker errors** - Unrelated to schema
3. **No business data logs** - Hooks may not be running or API is failing

## Next Steps

1. **Verify migration is applied:**
   ```sql
   -- Check if uploaded_images column exists
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'businesses' 
   AND column_name IN ('uploaded_images', 'uploaded_image');
   ```

2. **Check RPC function:**
   ```sql
   -- Verify function signature
   SELECT proname, proargnames, prorettype 
   FROM pg_proc 
   WHERE proname = 'list_businesses_optimized';
   ```

3. **Test API endpoint:**
   ```bash
   curl http://localhost:3000/api/businesses?limit=5
   ```

## Summary

✅ **All code is updated to use `uploaded_images` array**
✅ **No references to `uploaded_image` in active code** (only in migration files for backward compatibility)
⚠️ **Migration needs to be applied to database**
⚠️ **API may be failing due to RPC function not being updated**

