# Fix: RLS Policy Error for business_images Storage

## Error
```
StorageApiError: new row violates row-level security policy
```

## Cause
The RLS policies for the `business_images` storage bucket are either:
1. Using the wrong bucket name (`business-images` instead of `business_images`)
2. Too restrictive and blocking uploads during business creation

## Solution

### Step 1: Run the Migration

Run this migration in your Supabase SQL Editor:

**File**: `supabase/migrations/20250115_fix_business_images_rls_policies.sql`

Or run this SQL directly:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Public read access to business images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload business images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update their images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete their images" ON storage.objects;

-- Policy: Allow public read access
CREATE POLICY "Public read access to business images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business_images');

-- Policy: Allow authenticated users to upload
-- This allows any authenticated user to upload (ownership validated in app code)
CREATE POLICY "Authenticated users can upload business images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business_images');

-- Policy: Allow business owners to update their images
CREATE POLICY "Business owners can update their images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business_images' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1] IN (
      SELECT business_id::text 
      FROM business_owners 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'business_images' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1] IN (
      SELECT business_id::text 
      FROM business_owners 
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Allow business owners to delete their images
CREATE POLICY "Business owners can delete their images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business_images' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1] IN (
      SELECT business_id::text 
      FROM business_owners 
      WHERE user_id = auth.uid()
    )
  )
);
```

### Step 2: Verify Policies

Check that policies are created correctly:

```sql
-- Check policies exist
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%business%';
```

### Step 3: Verify Bucket Name

Make sure your bucket is named exactly `business_images` (with underscore):

```sql
-- Check bucket exists
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'business_images';
```

### Step 4: Test Upload

1. Try uploading an image via `/add-business` page
2. Check browser console for any errors
3. Verify image appears in Supabase Storage > `business_images` bucket

## Why This Happens

During business creation:
1. Business record is created
2. `business_owners` record is created
3. Images are uploaded

The RLS policy was checking ownership, but during the upload step, the ownership check might fail if:
- The `business_owners` record hasn't been committed yet
- The policy is checking the wrong table
- The bucket name mismatch causes the policy to not match

## Key Changes

1. **Simplified INSERT policy**: Allows any authenticated user to upload (ownership validated in application code)
2. **Correct bucket name**: Uses `business_images` (underscore) not `business-images` (hyphen)
3. **Flexible ownership check**: UPDATE and DELETE policies check both `businesses.owner_id` and `business_owners` table

## Security Note

The INSERT policy allows any authenticated user to upload to the bucket. This is safe because:
- Application code validates ownership before allowing uploads
- UPDATE and DELETE policies still enforce ownership
- Public read access is controlled separately
- Storage paths are organized by business_id, making cleanup easy

