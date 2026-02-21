# Debug: Business Images Not Uploading

## Issue
Business created but `uploaded_images` is null/empty. Images not appearing.

## Quick Checks

### 1. Check Browser Console
Look for these log messages:
- `[Add Business] Starting upload of X images`
- `[Add Business] Upload attempt 1:`
- `[Add Business] ✓ Successfully uploaded image`
- `[Add Business] Saving X image URLs to database`
- `[Add Business] ✓ Successfully saved X images`

### 2. Check for RLS Errors
Look for: `new row violates row-level security policy`

**Fix**: Run the migration:
```sql
-- File: supabase/migrations/20250115_fix_business_images_rls_policies.sql
```

### 3. Verify Bucket Exists
```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'business_images';
```

### 4. Verify Column Exists
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND column_name = 'uploaded_images';
```

Should return: `uploaded_images | ARRAY`

### 5. Check Storage Files
In Supabase Dashboard > Storage > `business_images` bucket:
- Check if files were uploaded
- Look for folder: `{business_id}/`
- Check file names match pattern: `{business_id}_{index}_{timestamp}.{ext}`

### 6. Check Database
```sql
SELECT id, name, uploaded_images, array_length(uploaded_images, 1) as image_count
FROM businesses
WHERE id = 'd0b6a027-6d1a-4690-a8c5-ace2a01c4a68';
```

## Common Issues

### Issue 1: RLS Policy Blocking Upload
**Symptom**: Console shows "new row violates row-level security policy"

**Fix**: 
1. Run migration: `supabase/migrations/20250115_fix_business_images_rls_policies.sql`
2. Or manually update INSERT policy:
```sql
DROP POLICY IF EXISTS "Authenticated users can upload business images" ON storage.objects;

CREATE POLICY "Authenticated users can upload business images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business_images');
```

### Issue 2: Column Doesn't Exist
**Symptom**: Error about "column uploaded_images does not exist"

**Fix**: Run migration to add column:
```sql
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS uploaded_images TEXT[];
```

### Issue 3: Upload Succeeds but DB Update Fails
**Symptom**: Files in storage but `uploaded_images` is null

**Check**: Look for error in console: `[Add Business] Error saving images to uploaded_images`

**Possible causes**:
- RLS on businesses table blocking update
- Column type mismatch
- Business record doesn't exist

### Issue 4: Silent Failure
**Symptom**: No errors but images not saved

**Debug**: Check browser console for:
- Upload errors (should show toast)
- Database update errors (should show toast)
- Network errors

## Step-by-Step Debug

1. **Open browser console** (F12)
2. **Try uploading images** on `/add-business` page
3. **Check console logs** - should see:
   ```
   [Add Business] Starting upload of X images
   [Add Business] Upload attempt 1: {...}
   [Add Business] ✓ Successfully uploaded image 1/X: https://...
   [Add Business] Upload complete. X/X images uploaded successfully.
   [Add Business] Saving X image URLs to database...
   [Add Business] ✓ Successfully saved X images
   ```

4. **If upload fails**: Check error message
   - RLS error → Run migration
   - Bucket not found → Check bucket name
   - Network error → Check connection

5. **If upload succeeds but DB fails**: Check:
   - Business exists in database
   - `uploaded_images` column exists
   - RLS allows update on businesses table

6. **Verify in database**:
```sql
SELECT uploaded_images 
FROM businesses 
WHERE id = 'your-business-id';
```

## Test Upload Manually

```sql
-- Test if you can insert into storage (replace with actual values)
-- This will show RLS errors if any
```

Or use Supabase Dashboard:
1. Go to Storage > `business_images`
2. Try uploading a file manually
3. If it fails, RLS is the issue

## Expected Flow

1. ✅ Business created → `businessId` returned
2. ✅ Images uploaded to storage → Files in `business_images/{businessId}/`
3. ✅ URLs generated → Array of public URLs
4. ✅ URLs saved to DB → `businesses.uploaded_images = [url1, url2, ...]`
5. ✅ Images display → On business profile page

If step 2 fails → RLS issue
If step 4 fails → Database/column issue

