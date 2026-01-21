-- Update Review Images Storage Bucket Name
-- Updates bucket from 'review-images' to 'review_images'

-- Update storage bucket (if it was created with the old name)
UPDATE storage.buckets 
SET 
  id = 'review_images',
  name = 'review_images'
WHERE id = 'review-images'
OR id = 'review_images';

-- If the bucket doesn't exist yet, create it with the correct name
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review_images',
  'review_images',
  true, -- Public bucket (images can be accessed via public URL)
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  name = 'review_images',
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Update storage policies for review_images bucket
DROP POLICY IF EXISTS "Public can view review images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload review images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own review images" ON storage.objects;

-- Allow public read access to review images
CREATE POLICY "Public can view review images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review_images');

-- Allow authenticated users to upload review images
CREATE POLICY "Authenticated users can upload review images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review_images' AND
    (storage.foldername(name))[1] IS NOT NULL -- Ensure there's at least one folder level
  );

-- Allow users to delete their own review images
CREATE POLICY "Users can delete their own review images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review_images' AND
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id::text = (storage.foldername(name))[1]
      AND reviews.user_id = auth.uid()
    )
  );

-- Update the URL generation function
CREATE OR REPLACE FUNCTION get_review_image_url(storage_path TEXT)
RETURNS TEXT AS $$
DECLARE
  supabase_url TEXT;
BEGIN
  supabase_url := current_setting('app.supabase_url', true);
  
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RETURN CONCAT('/storage/v1/object/public/review_images/', storage_path);
  ELSE
    RETURN CONCAT(supabase_url, '/storage/v1/object/public/review_images/', storage_path);
  END IF;
END;
$$ LANGUAGE plpgsql;

