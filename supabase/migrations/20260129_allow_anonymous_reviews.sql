-- Allow anonymous (guest) reviews: nullable user_id and RLS for INSERT
-- Guests can submit reviews with user_id = null; display as "Anonymous" in UI.
-- Authenticated users unchanged; guests cannot edit/delete reviews.

-- 1. Make user_id nullable on reviews (keep FK for when set)
ALTER TABLE public.reviews
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Allow anonymous INSERT: anyone can insert a review with user_id IS NULL
DROP POLICY IF EXISTS "Allow authenticated users to create reviews" ON public.reviews;
CREATE POLICY "Allow authenticated users to create reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id) OR (user_id IS NULL)
  );

-- 3. UPDATE/DELETE unchanged: only own reviews (user_id = auth.uid()), so anonymous reviews cannot be edited/deleted
-- Existing policies "Allow users to update their own reviews" and "Allow users to delete their own reviews"
-- use USING (auth.uid() = user_id), so rows with user_id NULL never match → safe.

-- 4. Index for listing reviews by user (user_id can be null; existing index handles non-null)
-- No change needed: idx_reviews_user_id exists; nullable user_id is supported.

COMMENT ON COLUMN public.reviews.user_id IS 'Author user ID; NULL for anonymous (guest) reviews.';
