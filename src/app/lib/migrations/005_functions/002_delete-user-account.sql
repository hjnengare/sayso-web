-- =============================================
-- FUNCTION: Delete User Account
-- Run this in your Supabase SQL editor
-- =============================================

-- Create function to delete user account
-- This must be SECURITY DEFINER to allow deletion of auth.users
-- 
-- CASCADE DELETE BEHAVIOR:
-- When a user is deleted from auth.users, the following tables will
-- automatically cascade delete due to ON DELETE CASCADE foreign keys:
--   - profiles (user_id)
--   - user_interests (user_id)
--   - user_subcategories (user_id)
--   - user_dealbreakers (user_id)
--   - reviews (user_id) -> which cascades to review_images
--   - review_replies (user_id)
--   - review_helpful_votes (user_id)
--   - review_flags (flagged_by) - flags created by user
--   - saved_businesses (user_id)
--   - notifications (user_id)
--   - search_history (user_id)
--   - saved_searches (user_id)
--   - user_stats (user_id)
--
-- Note: review_flags.reviewed_by uses ON DELETE SET NULL to preserve
-- flag records even if the reviewing admin account is deleted.
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete from auth.users (this will cascade to all related tables)
  -- All foreign keys with ON DELETE CASCADE will automatically delete
  -- related records. See migration 20250108_ensure_cascade_delete_on_account_deletion.sql
  -- for verification of cascade behavior.
  -- Note: RLS doesn't apply to auth.users table
  DELETE FROM auth.users WHERE id = p_user_id;
  
  -- Return void
  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
