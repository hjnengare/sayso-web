-- SQL statements to update business_images storage RLS policies
-- Run these in Supabase Dashboard > SQL Editor (with service role) OR create policies manually in Dashboard > Storage > Policies
-- These policies match the review_images pattern: permissive storage RLS, strict database RLS

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Public read access to business images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload business images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can upload their images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update business images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update their images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete their images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own business images" ON storage.objects;

-- Step 2: Create new policies

-- Policy 1: Public read access
CREATE POLICY "Public read access to business images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business_images');

-- Policy 2: Authenticated users can upload (permissive - matches review_images pattern)
CREATE POLICY "Authenticated users can upload business images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business_images' AND
  (storage.foldername(name))[1] IS NOT NULL
);

-- Policy 3: Authenticated users can update (permissive - matches review_images pattern)
CREATE POLICY "Authenticated users can update business images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business_images')
WITH CHECK (bucket_id = 'business_images');

-- Policy 4: Users can delete their own images (ownership enforced via database)
CREATE POLICY "Users can delete their own business images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business_images' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

-- Add comments
COMMENT ON POLICY "Authenticated users can upload business images" ON storage.objects IS 
  'Allows authenticated users to upload images to business_images bucket. Ownership is enforced by database RLS (businesses.owner_id = auth.uid()). Matches review_images pattern.';

COMMENT ON POLICY "Authenticated users can update business images" ON storage.objects IS 
  'Allows authenticated users to update files in business_images bucket. Ownership is enforced by database RLS. Matches review_images pattern.';

COMMENT ON POLICY "Users can delete their own business images" ON storage.objects IS 
  'Allows users to delete images only for businesses they own (businesses.owner_id = auth.uid()). Matches review_images pattern.';

