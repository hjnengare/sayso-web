-- Migration: Simplify business_images RLS policies to use only businesses.owner_id
-- Removes business_owners table dependency to prevent silent failures
-- Single source of truth: businesses.owner_id
--
-- This migration updates existing policies if they were already created.
-- Run this after 20250120_migrate_to_business_images_table.sql

-- =============================================
-- STEP 1: Drop existing policies
-- =============================================

DROP POLICY IF EXISTS "Business owners can insert images" ON public.business_images;
DROP POLICY IF EXISTS "Business owners can update their images" ON public.business_images;
DROP POLICY IF EXISTS "Business owners can delete their images" ON public.business_images;

-- =============================================
-- STEP 2: Recreate policies with simplified ownership check
-- =============================================

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
-- STEP 3: Add comments
-- =============================================

COMMENT ON POLICY "Business owners can insert images" ON public.business_images IS 
  'Allows business owners to insert images. Validates ownership via businesses.owner_id (single source of truth).';

COMMENT ON POLICY "Business owners can update their images" ON public.business_images IS 
  'Allows business owners to update their images. Validates ownership via businesses.owner_id (single source of truth).';

COMMENT ON POLICY "Business owners can delete their images" ON public.business_images IS 
  'Allows business owners to delete their images. Validates ownership via businesses.owner_id (single source of truth).';

