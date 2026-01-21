-- Supabase Storage Bucket Setup for Review Images
-- Run this SQL in your Supabase SQL Editor

-- Create the review-images storage bucket if it doesn't exist
-- Note: This needs to be done via Supabase Dashboard or Storage API
-- SQL commands for storage buckets are limited, so use the Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named 'review-images'
-- 3. Set it to Public (or Private with RLS policies)
-- 4. Configure CORS if needed

-- Storage bucket policies (RLS for storage)
-- These policies control who can upload/read/delete images

-- Allow authenticated users to upload review images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true, -- Public bucket (images can be accessed via public URL)
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Storage policies for review-images bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view review images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload review images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own review images" ON storage.objects;

-- Allow public read access to review images
CREATE POLICY "Public can view review images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-images');

-- Allow authenticated users to upload review images
-- Only allow uploads to paths that match the pattern: review-images/{review_id}/{filename}
CREATE POLICY "Authenticated users can upload review images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-images' AND
    (storage.foldername(name))[1] IS NOT NULL -- Ensure there's at least one folder level
  );

-- Allow users to delete their own review images
-- This requires checking if the review belongs to the user
-- Note: This is complex with storage policies, so we'll handle deletion via API
CREATE POLICY "Users can delete their own review images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review-images' AND
    -- Check if the review belongs to the user
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id::text = (storage.foldername(name))[1]
      AND reviews.user_id = auth.uid()
    )
  );

-- Function to generate public URL from storage path
CREATE OR REPLACE FUNCTION get_review_image_url(storage_path TEXT)
RETURNS TEXT AS $$
DECLARE
  supabase_url TEXT;
BEGIN
  -- Get Supabase URL from environment or use a placeholder
  -- In production, this should come from your Supabase project settings
  supabase_url := current_setting('app.supabase_url', true);
  
  IF supabase_url IS NULL OR supabase_url = '' THEN
    -- Fallback: construct URL from storage path
    -- Format: https://{project-ref}.supabase.co/storage/v1/object/public/review-images/{path}
    RETURN CONCAT('/storage/v1/object/public/review-images/', storage_path);
  ELSE
    RETURN CONCAT(supabase_url, '/storage/v1/object/public/review-images/', storage_path);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update review_images table to auto-generate image_url from storage_path
CREATE OR REPLACE FUNCTION update_review_image_url()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-generate image_url from storage_path if not provided
  IF NEW.image_url IS NULL OR NEW.image_url = '' THEN
    NEW.image_url := get_review_image_url(NEW.storage_path);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate image_url on insert/update
DROP TRIGGER IF EXISTS update_review_image_url_trigger ON review_images;
CREATE TRIGGER update_review_image_url_trigger
  BEFORE INSERT OR UPDATE ON review_images
  FOR EACH ROW
  EXECUTE FUNCTION update_review_image_url();

