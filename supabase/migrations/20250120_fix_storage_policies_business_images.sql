-- Migration: Fix storage policies for business_images bucket
-- Ensures owners can only upload/update/delete images in their own business folder
-- Path structure: {business_id}/{uuid}-{filename}
--
-- IMPORTANT: Storage policies require elevated permissions (service role or superuser).
-- If you get "must be owner of relation objects" error, you have two options:
--
-- OPTION 1: Run via Supabase Dashboard (Recommended)
-- 1. Go to Supabase Dashboard > Storage > Policies
-- 2. Select the 'business_images' bucket
-- 3. Create the policies manually using the SQL below (skip the DROP statements)
--
-- OPTION 2: Run with service role key
-- Use the Supabase CLI with service role key or run via SQL Editor with service role permissions
--
-- This migration attempts to create policies but will skip if permissions are insufficient.
-- You can then create them manually via the Dashboard.

-- Wrap everything in a DO block to handle permission errors gracefully
DO $$
BEGIN
  -- Drop old policies (may fail silently if they don't exist or insufficient permissions)
  BEGIN
    DROP POLICY IF EXISTS "Public read access to business images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload business images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update business images" ON storage.objects;
    DROP POLICY IF EXISTS "Business owners can delete their images" ON storage.objects;
    DROP POLICY IF EXISTS "Business owners can update their images" ON storage.objects;
    DROP POLICY IF EXISTS "Business owners can upload their images" ON storage.objects;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Insufficient privileges to drop storage policies. This is expected if not running as superuser.';
    WHEN OTHERS THEN
      RAISE NOTICE 'Note while dropping storage policies: %', SQLERRM;
  END;

  -- Policy: Allow public read access to business images
  -- This allows anyone to view business images (required for public listings)
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

  -- Policy: Allow business owners to upload images in their own business folder
  -- Single source of truth: businesses.owner_id (removed business_owners dependency)
  BEGIN
    CREATE POLICY "Business owners can upload their images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'business_images' AND
      -- Extract first folder (business_id) from path and check ownership
      (string_to_array(name, '/'))[1] IN (
        SELECT id::text FROM businesses WHERE owner_id = auth.uid()
      )
    );
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy "Business owners can upload their images" already exists';
    WHEN insufficient_privilege THEN
      RAISE WARNING 'Cannot create storage policy - insufficient privileges. Please create manually via Dashboard.';
      RAISE;
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating storage policy: %', SQLERRM;
      RAISE;
  END;

  -- Policy: Allow business owners to update images in their own business folder
  -- Single source of truth: businesses.owner_id (removed business_owners dependency)
  BEGIN
    CREATE POLICY "Business owners can update their images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'business_images' AND
      (string_to_array(name, '/'))[1] IN (
        SELECT id::text FROM businesses WHERE owner_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'business_images' AND
      (string_to_array(name, '/'))[1] IN (
        SELECT id::text FROM businesses WHERE owner_id = auth.uid()
      )
    );
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy "Business owners can update their images" already exists';
    WHEN insufficient_privilege THEN
      RAISE WARNING 'Cannot create storage policy - insufficient privileges. Please create manually via Dashboard.';
      RAISE;
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating storage policy: %', SQLERRM;
      RAISE;
  END;

  -- Policy: Allow business owners to delete images in their own business folder
  -- Single source of truth: businesses.owner_id (removed business_owners dependency)
  BEGIN
    CREATE POLICY "Business owners can delete their images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'business_images' AND
      -- Extract first folder (business_id) from path and check ownership
      (string_to_array(name, '/'))[1] IN (
        SELECT id::text FROM businesses WHERE owner_id = auth.uid()
      )
    );
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy "Business owners can delete their images" already exists';
    WHEN insufficient_privilege THEN
      RAISE WARNING 'Cannot create storage policy - insufficient privileges. Please create manually via Dashboard.';
      RAISE;
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating storage policy: %', SQLERRM;
      RAISE;
  END;

  RAISE NOTICE 'Storage policies created successfully';
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

-- Add comments (these don't require special permissions)
COMMENT ON POLICY "Business owners can upload their images" ON storage.objects IS 
  'Allows business owners to upload images only to their own business folder ({business_id}/...). Validates ownership via businesses.owner_id (single source of truth).';

COMMENT ON POLICY "Business owners can update their images" ON storage.objects IS 
  'Allows business owners to update images only in their own business folder. Validates ownership via businesses.owner_id (single source of truth).';

COMMENT ON POLICY "Business owners can delete their images" ON storage.objects IS 
  'Allows business owners to delete images only from their own business folder. Validates ownership via businesses.owner_id (single source of truth).';
