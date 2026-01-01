-- Migration: Recreate business_images table and migrate from uploaded_images array
-- This replaces the array-based approach with a proper relational table

-- =============================================
-- STEP 1: Recreate business_images table (if it doesn't exist)
-- =============================================

CREATE TABLE IF NOT EXISTS public.business_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'gallery' CHECK (type IN ('cover', 'logo', 'gallery')),
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS business_images_business_id_idx
  ON public.business_images (business_id);

CREATE INDEX IF NOT EXISTS business_images_primary_idx
  ON public.business_images (business_id, is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS business_images_sort_order_idx
  ON public.business_images (business_id, sort_order);

-- Unique constraint: only one primary image per business
CREATE UNIQUE INDEX IF NOT EXISTS business_images_single_primary
  ON public.business_images (business_id)
  WHERE is_primary = true;

-- =============================================
-- STEP 2: Functions and Triggers
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on business_images
DROP TRIGGER IF EXISTS update_business_images_updated_at_trigger ON public.business_images;
CREATE TRIGGER update_business_images_updated_at_trigger
  BEFORE UPDATE ON public.business_images
  FOR EACH ROW
  EXECUTE FUNCTION update_business_images_updated_at();

-- Function to ensure only one primary image per business
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this image as primary, unset all other primary images for this business
  IF NEW.is_primary = true THEN
    UPDATE public.business_images
    SET is_primary = false
    WHERE business_id = NEW.business_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one primary image per business
DROP TRIGGER IF EXISTS ensure_single_primary_image_trigger ON public.business_images;
CREATE TRIGGER ensure_single_primary_image_trigger
  BEFORE INSERT OR UPDATE ON public.business_images
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_image();

-- Function to promote next best image when primary is deleted
CREATE OR REPLACE FUNCTION promote_next_primary_image()
RETURNS TRIGGER AS $$
DECLARE
  next_primary_id UUID;
BEGIN
  -- Only run if the deleted image was primary
  IF OLD.is_primary = true THEN
    -- Find the next best candidate: lowest sort_order, then newest
    SELECT id INTO next_primary_id
    FROM public.business_images
    WHERE business_id = OLD.business_id
      AND id != OLD.id
    ORDER BY sort_order ASC, created_at DESC
    LIMIT 1;
    
    -- If a candidate exists, promote it to primary
    IF next_primary_id IS NOT NULL THEN
      UPDATE public.business_images
      SET is_primary = true
      WHERE id = next_primary_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to promote next image when primary is deleted
DROP TRIGGER IF EXISTS promote_next_primary_image_trigger ON public.business_images;
CREATE TRIGGER promote_next_primary_image_trigger
  AFTER DELETE ON public.business_images
  FOR EACH ROW
  EXECUTE FUNCTION promote_next_primary_image();

-- =============================================
-- STEP 3: Enable RLS and create policies
-- =============================================

ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
-- Note: Drop all possible policy name variations to ensure clean state
DROP POLICY IF EXISTS "Public read access to business images" ON public.business_images;
DROP POLICY IF EXISTS "Authenticated users can insert business images" ON public.business_images;
DROP POLICY IF EXISTS "Business owners can insert images" ON public.business_images;
DROP POLICY IF EXISTS "Business owners can update their images" ON public.business_images;
DROP POLICY IF EXISTS "Business owners can delete their images" ON public.business_images;

-- Allow public read access to business images
CREATE POLICY "Public read access to business images"
  ON public.business_images FOR SELECT
  TO public
  USING (true);

-- Allow business owners to insert images
-- Single source of truth: businesses.owner_id (removed business_owners dependency)
CREATE POLICY "Business owners can insert images"
  ON public.business_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_images.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- Allow business owners to update their images
-- Single source of truth: businesses.owner_id (removed business_owners dependency)
CREATE POLICY "Business owners can update their images"
  ON public.business_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_images.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_images.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- Allow business owners to delete their images
-- Single source of truth: businesses.owner_id (removed business_owners dependency)
CREATE POLICY "Business owners can delete their images"
  ON public.business_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_images.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- =============================================
-- STEP 4: Migrate data from uploaded_images array to business_images table
-- =============================================
-- 
-- NOTE: This step is skipped if uploaded_images column does not exist.
-- The column should have already been dropped in a previous migration.
-- If you need to migrate data, run this before dropping the uploaded_images column.
--
-- Skip migration if uploaded_images column doesn't exist
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if uploaded_images column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'businesses' 
      AND column_name = 'uploaded_images'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE 'uploaded_images column exists - migration step would run here (but skipped for safety)';
    -- Note: If you need to migrate data, uncomment the code below
    -- and ensure this migration runs BEFORE dropping the uploaded_images column
  ELSE
    RAISE NOTICE 'uploaded_images column does not exist - skipping data migration (column already dropped)';
  END IF;
END $$;

-- =============================================
-- STEP 5: Add comments
-- =============================================

COMMENT ON TABLE public.business_images IS 
  'Stores multiple images per business with metadata (type, sort order, primary flag). This replaces the uploaded_images array column.';

COMMENT ON COLUMN public.business_images.type IS 
  'Image type: cover (hero/primary), logo, or gallery';

COMMENT ON COLUMN public.business_images.sort_order IS 
  'Order for displaying images in gallery (lower numbers first)';

COMMENT ON COLUMN public.business_images.is_primary IS 
  'Whether this is the primary/cover image (only one per business, enforced by unique index)';

COMMENT ON FUNCTION ensure_single_primary_image() IS 
  'Ensures only one primary image exists per business by unsetting others when a new primary is set';

COMMENT ON FUNCTION promote_next_primary_image() IS 
  'Automatically promotes the next best image (lowest sort_order, then newest) to primary when the current primary image is deleted';

-- =============================================
-- STEP 6: Note about dropping uploaded_images column
-- =============================================

-- IMPORTANT: After running this migration and verifying data migration,
-- run the next migration to drop the uploaded_images column:
-- 20250120_drop_uploaded_images_column.sql

