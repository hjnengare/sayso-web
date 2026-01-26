-- Migration: Backfill onboarding_complete for existing users
-- This ensures users who have completed onboarding (have preferences data)
-- but don't have onboarding_complete = true are properly marked.
--
-- REASONING:
-- Some users may have completed onboarding before the onboarding_complete
-- boolean was properly being set. This backfill identifies those users
-- and marks them as complete.
--
-- CRITERIA FOR COMPLETION:
-- A user is considered to have completed onboarding if they have:
-- - At least 3 interests (minimum required in onboarding)
-- - At least 1 subcategory (minimum required)
-- - At least 1 dealbreaker (minimum required)

-- First, let's log how many users will be affected
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM profiles p
  WHERE p.onboarding_complete IS NOT TRUE
    AND p.current_role = 'user'  -- Only personal users, not business accounts
    AND (
      -- Check if they have actual preference data
      EXISTS (SELECT 1 FROM user_interests ui WHERE ui.user_id = p.user_id LIMIT 3)
      AND EXISTS (SELECT 1 FROM user_subcategories us WHERE us.user_id = p.user_id LIMIT 1)
      AND EXISTS (SELECT 1 FROM user_dealbreakers ud WHERE ud.user_id = p.user_id LIMIT 1)
    );

  RAISE NOTICE 'Users to backfill: %', v_count;
END $$;

-- Perform the backfill
UPDATE profiles p
SET
  onboarding_complete = TRUE,
  onboarding_step = 'complete',
  updated_at = NOW()
WHERE p.onboarding_complete IS NOT TRUE
  AND p.current_role = 'user'  -- Only personal users
  AND (
    -- Verify they have the minimum required preferences
    SELECT COUNT(*) FROM user_interests ui WHERE ui.user_id = p.user_id
  ) >= 3  -- At least 3 interests
  AND (
    SELECT COUNT(*) FROM user_subcategories us WHERE us.user_id = p.user_id
  ) >= 1  -- At least 1 subcategory
  AND (
    SELECT COUNT(*) FROM user_dealbreakers ud WHERE ud.user_id = p.user_id
  ) >= 1;  -- At least 1 dealbreaker

-- Also update the counts to ensure they're accurate
UPDATE profiles p
SET
  interests_count = (
    SELECT COUNT(*) FROM user_interests ui WHERE ui.user_id = p.user_id
  ),
  subcategories_count = (
    SELECT COUNT(*) FROM user_subcategories us WHERE us.user_id = p.user_id
  ),
  dealbreakers_count = (
    SELECT COUNT(*) FROM user_dealbreakers ud WHERE ud.user_id = p.user_id
  ),
  updated_at = NOW()
WHERE p.onboarding_complete = TRUE
  AND (
    p.interests_count IS NULL
    OR p.subcategories_count IS NULL
    OR p.dealbreakers_count IS NULL
    OR p.interests_count != (SELECT COUNT(*) FROM user_interests ui WHERE ui.user_id = p.user_id)
    OR p.subcategories_count != (SELECT COUNT(*) FROM user_subcategories us WHERE us.user_id = p.user_id)
    OR p.dealbreakers_count != (SELECT COUNT(*) FROM user_dealbreakers ud WHERE ud.user_id = p.user_id)
  );

-- Log final state
DO $$
DECLARE
  v_complete INTEGER;
  v_incomplete INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_complete
  FROM profiles WHERE onboarding_complete = TRUE AND current_role = 'user';

  SELECT COUNT(*) INTO v_incomplete
  FROM profiles WHERE (onboarding_complete IS NOT TRUE OR onboarding_complete = FALSE) AND current_role = 'user';

  RAISE NOTICE 'Backfill complete. Users with onboarding_complete=true: %, incomplete: %', v_complete, v_incomplete;
END $$;
