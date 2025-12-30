-- Business Images Storage Bucket Setup
-- This migration documents the required Supabase Storage bucket setup
-- Note: Bucket creation must be done via Supabase Dashboard or Management API

-- ============================================================================
-- STEP 1: Create Storage Bucket (via Supabase Dashboard)
-- ============================================================================
-- 
-- Go to Supabase Dashboard > Storage > Create Bucket
-- 
-- Bucket Name: business-images
-- Public: ✅ Yes (recommended for public business listings)
-- File Size Limit: 5MB (or as needed)
-- Allowed MIME Types: image/jpeg, image/png, image/webp, image/gif
--
-- ============================================================================
-- STEP 2: Storage Bucket RLS Policies (Run this SQL)
-- ============================================================================

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Public read access to business images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload business images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update their images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete their images" ON storage.objects;

-- Policy: Allow public read access to business images
-- This allows anyone to view business images (required for public listings)
CREATE POLICY "Public read access to business images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-images');

-- Policy: Allow authenticated users to upload business images
-- Only authenticated users can upload (business owners)
CREATE POLICY "Authenticated users can upload business images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-images');

-- Policy: Allow business owners to update their own business images
-- Users can only update images in their own business folder
CREATE POLICY "Business owners can update their images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'business-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Policy: Allow business owners to delete their own business images
-- Users can only delete images in their own business folder
CREATE POLICY "Business owners can delete their images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 3: Verify Bucket Setup
-- ============================================================================
-- 
-- After creating the bucket and running the policies above, verify:
-- 
-- 1. Bucket exists: SELECT * FROM storage.buckets WHERE id = 'business-images';
-- 2. Policies are active: SELECT * FROM storage.policies WHERE bucket_id = 'business-images';
-- 3. Test upload: Try uploading an image via the add-business page
-- 4. Test public access: Check if uploaded image URL is accessible without auth
--
-- ============================================================================
-- Storage Path Structure
-- ============================================================================
-- 
-- Images are stored with the following structure:
-- business-images/{business_id}/{business_id}_{index}_{timestamp}.{ext}
-- 
-- Example:
-- business-images/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174000_0_1699123456789.jpg
-- 
-- This structure:
-- - Organizes images by business ID
-- - Prevents filename conflicts
-- - Makes it easy to find all images for a business
-- - Allows RLS policies to work based on folder structure
--
-- ============================================================================
-- Notes
-- ============================================================================
-- 
-- 1. The bucket MUST be public for business images to display on public pages
-- 2. If you need private images, use signed URLs instead
-- 3. Consider adding image optimization/processing before upload
-- 4. Monitor storage usage to avoid exceeding limits
-- 5. Consider implementing image cleanup when businesses are deleted
--

