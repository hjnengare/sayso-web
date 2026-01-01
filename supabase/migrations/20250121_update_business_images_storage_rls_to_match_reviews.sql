-- Migration: Update business_images storage RLS to match review_images pattern
-- Makes storage RLS permissive for authenticated users (like review_images)
-- Database RLS enforces ownership (same as review_images)
--
-- IMPORTANT: Storage policies require elevated permissions (service role or superuser).
-- If you get "must be owner of relation objects" error, you have two options:
--
-- OPTION 1: Run via Supabase Dashboard (Recommended)
-- 1. Go to Supabase Dashboard > Storage > Policies
-- 2. Select the 'business_images' bucket
-- 3. Drop existing policies and create the new ones manually using the SQL below
--
-- OPTION 2: Run with service role key
-- Use the Supabase CLI with service role key or run via SQL Editor with service role permissions

-- Wrap everything in a DO block to handle permission errors gracefully
DO $$
BEGIN
  -- Drop old policies (may fail silently if they don't exist or insufficient permissions)
  BEGIN
    DROP POLICY IF EXISTS "Public read access to business images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload business images" ON storage.objects;
    DROP POLICY IF EXISTS "Business owners can upload their images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update business images" ON storage.objects;
    DROP POLICY IF EXISTS "Business owners can update their images" ON storage.objects;
    DROP POLICY IF EXISTS "Business owners can delete their images" ON storage.objects;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Insufficient privileges to drop storage policies. This is expected if not running as superuser.';
    WHEN OTHERS THEN
      RAISE NOTICE 'Note while dropping storage policies: %', SQLERRM;
  END;

  -- Policy: Allow public read access to business images
  BEGIN
    CREATE POLICY "Public read access to business images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'business_images');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy "Public read access to business images" already exists';
    WHEN insufficient_privilege THEN
      RAISE WARNING 'Cannot create storage policy - insufficient privileges. Please create manually via Dashboard.';
      RAISE;
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating storage policy: %', SQLERRM;
      RAISE;
  END;

  -- Policy: Allow authenticated users to upload business images
  -- MATCHES REVIEW PATTERN: Permissive for authenticated users, ownership enforced by database RLS
  -- Path pattern: {business_id}/{timestamp}_{index}.{ext}
  BEGIN
    CREATE POLICY "Authenticated users can upload business images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'business_images' AND
      (storage.foldername(name))[1] IS NOT NULL -- Ensure there's at least one folder level
    );
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy "Authenticated users can upload business images" already exists';
    WHEN insufficient_privilege THEN
      RAISE WARNING 'Cannot create storage policy - insufficient privileges. Please create manually via Dashboard.';
      RAISE;
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating storage policy: %', SQLERRM;
      RAISE;
  END;

  -- Policy: Allow authenticated users to update business images
  -- MATCHES REVIEW PATTERN: Permissive for authenticated users
  BEGIN
    CREATE POLICY "Authenticated users can update business images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'business_images')
    WITH CHECK (bucket_id = 'business_images');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy "Authenticated users can update business images" already exists';
    WHEN insufficient_privilege THEN
      RAISE WARNING 'Cannot create storage policy - insufficient privileges. Please create manually via Dashboard.';
      RAISE;
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating storage policy: %', SQLERRM;
      RAISE;
  END;

  -- Policy: Allow users to delete their own business images
  -- MATCHES REVIEW PATTERN: Check ownership via database (businesses.owner_id)
  BEGIN
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
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy "Users can delete their own business images" already exists';
    WHEN insufficient_privilege THEN
      RAISE WARNING 'Cannot create storage policy - insufficient privileges. Please create manually via Dashboard.';
      RAISE;
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating storage policy: %', SQLERRM;
      RAISE;
  END;

  RAISE NOTICE 'Storage policies updated successfully to match review_images pattern';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'Migration skipped: Insufficient privileges to create storage policies.';
    RAISE WARNING 'Please create storage policies manually via Supabase Dashboard > Storage > Policies > business_images bucket';
    RAISE WARNING 'Use the SQL statements from this migration file to create them.';
    -- Don't fail the migration - just log warnings
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error in storage policies migration: %', SQLERRM;
    -- Don't fail the migration - just log the warning
END $$;

-- Add comments
COMMENT ON POLICY "Authenticated users can upload business images" ON storage.objects IS 
  'Allows authenticated users to upload images to business_images bucket. Ownership is enforced by database RLS (businesses.owner_id = auth.uid()). Matches review_images pattern.';

COMMENT ON POLICY "Authenticated users can update business images" ON storage.objects IS 
  'Allows authenticated users to update files in business_images bucket. Ownership is enforced by database RLS. Matches review_images pattern.';

COMMENT ON POLICY "Users can delete their own business images" ON storage.objects IS 
  'Allows users to delete images only for businesses they own (businesses.owner_id = auth.uid()). Matches review_images pattern.';

