-- Storage policies for events_and_specials image uploads.
-- Ensures Add Event/Add Special image dropbox can upload and read images.

-- Ensure bucket exists (idempotent). If it already exists, no-op.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'events_and_specials',
  'events_and_specials',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Recreate policies idempotently.
DROP POLICY IF EXISTS "Public read access to events and specials images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload events and specials images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own events and specials images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own events and specials images" ON storage.objects;

-- Public read for event/special images.
CREATE POLICY "Public read access to events and specials images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'events_and_specials');

-- Authenticated users can upload only under their own user-id folder:
-- path pattern: {auth.uid()}/{filename}
CREATE POLICY "Authenticated users can upload events and specials images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'events_and_specials'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update only their own files in this bucket.
CREATE POLICY "Users can update their own events and specials images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'events_and_specials'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'events_and_specials'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete only their own files in this bucket.
CREATE POLICY "Users can delete their own events and specials images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'events_and_specials'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
