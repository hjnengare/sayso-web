-- Business Images Table
-- Stores multiple images per business with metadata (type, sort order, primary flag)
-- This replaces the single uploaded_image field with a more flexible structure

-- Create business_images table
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

-- Enable Row Level Security
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow public read access to business images
DROP POLICY IF EXISTS "Public read access to business images" ON public.business_images;
CREATE POLICY "Public read access to business images"
  ON public.business_images FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert business images
DROP POLICY IF EXISTS "Authenticated users can insert business images" ON public.business_images;
CREATE POLICY "Authenticated users can insert business images"
  ON public.business_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow business owners to update their business images
DROP POLICY IF EXISTS "Business owners can update their images" ON public.business_images;
CREATE POLICY "Business owners can update their images"
  ON public.business_images FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Allow business owners to delete their business images
DROP POLICY IF EXISTS "Business owners can delete their images" ON public.business_images;
CREATE POLICY "Business owners can delete their images"
  ON public.business_images FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Migration: Move existing uploaded_image data to business_images table
-- This preserves existing images when migrating from the old structure
DO $$
DECLARE
  business_record RECORD;
BEGIN
  FOR business_record IN 
    SELECT id, uploaded_image 
    FROM public.businesses 
    WHERE uploaded_image IS NOT NULL 
      AND uploaded_image != ''
      AND NOT EXISTS (
        SELECT 1 FROM public.business_images 
        WHERE business_id = businesses.id AND is_primary = true
      )
  LOOP
    INSERT INTO public.business_images (
      business_id,
      url,
      type,
      sort_order,
      is_primary,
      created_at
    ) VALUES (
      business_record.id,
      business_record.uploaded_image,
      'cover',
      0,
      true,
      NOW()
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Add comments
COMMENT ON TABLE public.business_images IS 'Stores multiple images per business with metadata (type, sort order, primary flag)';
COMMENT ON COLUMN public.business_images.type IS 'Image type: cover (hero/primary), logo, or gallery';
COMMENT ON COLUMN public.business_images.sort_order IS 'Order for displaying images in gallery (lower numbers first)';
COMMENT ON COLUMN public.business_images.is_primary IS 'Whether this is the primary/cover image (only one per business)';
COMMENT ON FUNCTION promote_next_primary_image() IS 'Automatically promotes the next best image (lowest sort_order, then newest) to primary when the current primary image is deleted';

