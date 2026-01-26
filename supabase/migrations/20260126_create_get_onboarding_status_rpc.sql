-- Migration: Create get_onboarding_status RPC
-- This RPC function is designed to be called from Edge middleware where
-- RLS context may not be properly established on mobile hard refresh.
--
-- WHY THIS EXISTS:
-- On mobile hard refresh, the middleware's direct profile query can fail
-- because the Supabase client context may not have auth established for RLS,
-- even though getUser() succeeds (JWT is in cookies).
--
-- SOLUTION:
-- SECURITY DEFINER bypasses RLS, making this query always succeed
-- as long as the user_id is valid.

-- Drop existing function if exists (for idempotency)
DROP FUNCTION IF EXISTS get_onboarding_status(UUID);

/**
 * get_onboarding_status - Reliably fetch user's onboarding status
 *
 * This function uses SECURITY DEFINER to bypass RLS, ensuring the query
 * always succeeds when called from middleware (even on mobile hard refresh).
 *
 * @param p_user_id - The user's UUID (from auth.getUser())
 * @returns JSON object with:
 *   - found: boolean (whether profile exists)
 *   - onboarding_complete: boolean | null
 *   - current_role: text | null
 *   - role: text | null
 *   - interests_count: integer
 *   - subcategories_count: integer
 *   - dealbreakers_count: integer
 */
CREATE OR REPLACE FUNCTION get_onboarding_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'found', FALSE,
      'error', 'user_id is required'
    );
  END IF;

  -- Fetch profile data
  SELECT
    onboarding_complete,
    current_role,
    role,
    COALESCE(interests_count, 0) as interests_count,
    COALESCE(subcategories_count, 0) as subcategories_count,
    COALESCE(dealbreakers_count, 0) as dealbreakers_count
  INTO v_profile
  FROM profiles
  WHERE user_id = p_user_id;

  -- Check if profile was found
  IF NOT FOUND THEN
    RETURN json_build_object(
      'found', FALSE,
      'onboarding_complete', FALSE,
      'current_role', 'user',
      'role', 'user',
      'interests_count', 0,
      'subcategories_count', 0,
      'dealbreakers_count', 0
    );
  END IF;

  -- Return profile data
  RETURN json_build_object(
    'found', TRUE,
    'onboarding_complete', COALESCE(v_profile.onboarding_complete, FALSE),
    'current_role', COALESCE(v_profile.current_role, 'user'),
    'role', COALESCE(v_profile.role, 'user'),
    'interests_count', v_profile.interests_count,
    'subcategories_count', v_profile.subcategories_count,
    'dealbreakers_count', v_profile.dealbreakers_count
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return safe default
    RAISE WARNING 'get_onboarding_status error for user %: %', p_user_id, SQLERRM;
    RETURN json_build_object(
      'found', FALSE,
      'error', SQLERRM,
      'onboarding_complete', FALSE,
      'current_role', 'user',
      'role', 'user'
    );
END;
$$;

-- Grant execute permission to authenticated users and anon (for middleware)
-- IMPORTANT: anon role needs access because middleware may call this
-- before the auth context is fully established
GRANT EXECUTE ON FUNCTION get_onboarding_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_onboarding_status(UUID) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_onboarding_status IS
'Reliably fetch user onboarding status. Uses SECURITY DEFINER to bypass RLS,
making it safe to call from Edge middleware where RLS context may not be established.';
