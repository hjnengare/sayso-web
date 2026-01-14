-- =============================================
-- BADGES SYSTEM - RLS POLICIES
-- =============================================
-- Adds Row Level Security policies to badges tables
-- Ensures proper access control while maintaining functionality

-- =============================================
-- 1. ENABLE RLS ON BADGES TABLES
-- =============================================

-- Enable RLS on badges catalog table
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_badges table
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. BADGES CATALOG POLICIES
-- =============================================

-- Allow all authenticated users to read the badges catalog
-- This is safe as badges are public reference data
CREATE POLICY "Badges catalog is viewable by authenticated users"
  ON public.badges
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- 3. USER_BADGES POLICIES
-- =============================================

-- Allow all authenticated users to read all user badges
-- This is needed for:
-- - Displaying badges on reviewer cards
-- - Displaying badges on review cards
-- - Leaderboards and community features
-- Note: This only exposes which badges users have earned, not private data
CREATE POLICY "User badges are viewable by authenticated users"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow badge awarding through service role (backend API)
-- This ensures badges can only be awarded by the server-side logic
-- which properly validates badge eligibility
CREATE POLICY "Only service role can insert badges"
  ON public.user_badges
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Prevent badge deletion by users
-- Badges should be permanent once earned
-- Only service role can delete (for admin/support purposes)
CREATE POLICY "Only service role can delete badges"
  ON public.user_badges
  FOR DELETE
  TO service_role
  USING (true);

-- Prevent badge updates
-- Badges should not be modified once awarded
-- The awarded_at timestamp should remain immutable
CREATE POLICY "No one can update badges"
  ON public.user_badges
  FOR UPDATE
  TO authenticated
  USING (false);

-- =============================================
-- 4. ADDITIONAL SECURITY NOTES
-- =============================================

-- Note: The badge awarding endpoint (/api/badges/check-and-award)
-- uses the service role client to insert badges, bypassing RLS.
-- This is intentional and secure because:
-- 1. The endpoint is authenticated (requires valid user session)
-- 2. Badge eligibility is validated via RPC functions
-- 3. Duplicate prevention is handled by PRIMARY KEY constraint
-- 4. All badge logic is server-side, not exposed to clients

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- RLS policies added to badges system
-- Security: ✅ Badges can only be awarded by server
-- Visibility: ✅ All users can see earned badges (public achievements)
-- Integrity: ✅ Badges cannot be modified or deleted by users
