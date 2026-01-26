
DROP FUNCTION IF EXISTS complete_onboarding(UUID, UUID[], UUID[], TEXT[]);

/**
 * complete_onboarding - Atomic onboarding completion
 *
 * Saves interests, subcategories, and dealbreakers in ONE transaction,
 * then marks onboarding_complete = true.
 *
 * This is the ONLY way to complete onboarding for personal users.
 * If ANY step fails, the entire transaction rolls back.
 *
 * @param p_user_id - The user's UUID
 * @param p_interest_ids - Array of interest UUIDs (3-6 required)
 * @param p_subcategory_ids - Array of subcategory UUIDs (1-10 required)
 * @param p_dealbreaker_ids - Array of dealbreaker IDs (1-3 required)
 * @returns JSON with success status and counts
 */
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_interest_ids UUID[],
  p_subcategory_ids UUID[],
  p_dealbreaker_ids TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interests_count INTEGER;
  v_subcategories_count INTEGER;
  v_dealbreakers_count INTEGER;
  v_profile_exists BOOLEAN;
  v_current_role TEXT;
BEGIN
  -- Validate input arrays
  v_interests_count := COALESCE(array_length(p_interest_ids, 1), 0);
  v_subcategories_count := COALESCE(array_length(p_subcategory_ids, 1), 0);
  v_dealbreakers_count := COALESCE(array_length(p_dealbreaker_ids, 1), 0);

  -- Validate interests (3-6 required)
  IF v_interests_count < 3 OR v_interests_count > 6 THEN
    RAISE EXCEPTION 'Interests must be between 3 and 6 (got %)', v_interests_count;
  END IF;

  -- Validate subcategories (1-10 required)
  IF v_subcategories_count < 1 OR v_subcategories_count > 10 THEN
    RAISE EXCEPTION 'Subcategories must be between 1 and 10 (got %)', v_subcategories_count;
  END IF;

  -- Validate dealbreakers (1-3 required)
  IF v_dealbreakers_count < 1 OR v_dealbreakers_count > 3 THEN
    RAISE EXCEPTION 'Dealbreakers must be between 1 and 3 (got %)', v_dealbreakers_count;
  END IF;

  -- Check if profile exists and get current_role
  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = p_user_id), "current_role"
  INTO v_profile_exists, v_current_role
  FROM profiles WHERE user_id = p_user_id;

  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  -- Business owners should not complete personal onboarding
  IF v_current_role = 'business_owner' THEN
    RAISE EXCEPTION 'Business accounts do not complete personal onboarding';
  END IF;

  -- ============================================
  -- BEGIN ATOMIC TRANSACTION
  -- All operations below happen in one transaction
  -- If any fail, ALL are rolled back
  -- ============================================

  -- 1. Replace user interests (delete old, insert new)
  DELETE FROM user_interests WHERE user_id = p_user_id;

  INSERT INTO user_interests (user_id, interest_id, created_at)
  SELECT p_user_id, unnest(p_interest_ids), NOW();

  -- 2. Replace user subcategories (delete old, insert new)
  DELETE FROM user_subcategories WHERE user_id = p_user_id;

  INSERT INTO user_subcategories (user_id, subcategory_id, created_at)
  SELECT p_user_id, unnest(p_subcategory_ids), NOW();

  -- 3. Replace user dealbreakers (delete old, insert new)
  DELETE FROM user_dealbreakers WHERE user_id = p_user_id;

  INSERT INTO user_dealbreakers (user_id, dealbreaker_id, created_at)
  SELECT p_user_id, unnest(p_dealbreaker_ids), NOW();

  -- 4. Update profile with completion status and counts
  UPDATE profiles
  SET
    onboarding_complete = TRUE,
    onboarding_step = 'complete',
    interests_count = v_interests_count,
    subcategories_count = v_subcategories_count,
    dealbreakers_count = v_dealbreakers_count,
    "current_role" = 'user',
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- ============================================
  -- END ATOMIC TRANSACTION
  -- ============================================

  -- Return success with counts
  RETURN json_build_object(
    'success', TRUE,
    'onboarding_complete', TRUE,
    'interests_count', v_interests_count,
    'subcategories_count', v_subcategories_count,
    'dealbreakers_count', v_dealbreakers_count
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with context
    RAISE EXCEPTION 'complete_onboarding failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_onboarding(UUID, UUID[], UUID[], TEXT[]) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION complete_onboarding IS
'Atomic onboarding completion for personal users. Saves interests, subcategories, dealbreakers and marks onboarding_complete=true in a single transaction.';
