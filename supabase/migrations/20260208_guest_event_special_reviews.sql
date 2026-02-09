-- Guest Reviews for Events & Specials
-- Follows the pattern from 20260129_allow_anonymous_reviews.sql (business reviews).
-- Allows guest users to submit reviews with user_id = NULL, storing their name/email/IP.

-- 1. Make user_id nullable on both tables
ALTER TABLE public.event_reviews ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.special_reviews ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add guest-specific columns
ALTER TABLE public.event_reviews
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS ip_address INET;

ALTER TABLE public.special_reviews
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS ip_address INET;

-- 3. Update INSERT RLS: allow user_id IS NULL (guest inserts via service role)
DROP POLICY IF EXISTS "Users can create their own event reviews" ON public.event_reviews;
CREATE POLICY "Users can create their own event reviews"
  ON public.event_reviews FOR INSERT
  WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

DROP POLICY IF EXISTS "Users can create their own special reviews" ON public.special_reviews;
CREATE POLICY "Users can create their own special reviews"
  ON public.special_reviews FOR INSERT
  WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

-- 4. UPDATE/DELETE policies unchanged — auth.uid() = user_id never matches NULL,
--    so guest reviews cannot be edited or deleted. Safe.

-- 5. Grant service_role full access (for server-side guest inserts)
GRANT ALL ON public.event_reviews TO service_role;
GRANT ALL ON public.special_reviews TO service_role;

-- 6. Index for IP-based rate limiting
CREATE INDEX IF NOT EXISTS idx_event_reviews_ip_created ON event_reviews(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_special_reviews_ip_created ON special_reviews(ip_address, created_at DESC);

-- 7. Drop the unique constraint on (event_id, user_id) and (special_id, user_id)
--    since user_id can be NULL and multiple guests should be able to review the same item
ALTER TABLE public.event_reviews DROP CONSTRAINT IF EXISTS event_reviews_event_id_user_id_key;
ALTER TABLE public.special_reviews DROP CONSTRAINT IF EXISTS special_reviews_special_id_user_id_key;

-- 8. Re-add unique constraint only for authenticated users (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_reviews_unique_user
  ON event_reviews(event_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_special_reviews_unique_user
  ON special_reviews(special_id, user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN public.event_reviews.user_id IS 'Author user ID; NULL for guest reviews.';
COMMENT ON COLUMN public.special_reviews.user_id IS 'Author user ID; NULL for guest reviews.';
