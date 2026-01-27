-- Migration: Rename profiles.current_role -> account_role and update dependent functions
-- Date: 2026-01-27

BEGIN;

-- 1) Rename column safely (handles mixed states)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'current_role'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'account_role'
    ) THEN
      -- If both exist, preserve data then drop old column
      EXECUTE 'UPDATE public.profiles SET account_role = COALESCE(account_role, "current_role")';
      EXECUTE 'ALTER TABLE public.profiles DROP COLUMN "current_role"';
    ELSE
      EXECUTE 'ALTER TABLE public.profiles RENAME COLUMN "current_role" TO "account_role"';
    END IF;
  END IF;
END $$;

-- 2) Update get_onboarding_status to return account_role
DROP FUNCTION IF EXISTS get_onboarding_status(UUID);

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
    account_role,
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
      'account_role', 'user',
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
    'account_role', COALESCE(v_profile.account_role, 'user'),
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
      'account_role', 'user',
      'role', 'user'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_onboarding_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_onboarding_status(UUID) TO anon;

COMMENT ON FUNCTION get_onboarding_status IS
'Reliably fetch user onboarding status. Uses SECURITY DEFINER to bypass RLS,
making it safe to call from Edge middleware where RLS context may not be established.';

-- 3) Update complete_onboarding to use account_role
DROP FUNCTION IF EXISTS complete_onboarding(UUID, UUID[], UUID[], TEXT[]);

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
  v_account_role TEXT;
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

  -- Check if profile exists and get account_role
  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = p_user_id), "account_role"
  INTO v_profile_exists, v_account_role
  FROM profiles WHERE user_id = p_user_id;

  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  -- Business owners should not complete personal onboarding
  IF v_account_role = 'business_owner' THEN
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
    "account_role" = 'user',
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

GRANT EXECUTE ON FUNCTION complete_onboarding(UUID, UUID[], UUID[], TEXT[]) TO authenticated;

COMMENT ON FUNCTION complete_onboarding IS
'Atomic onboarding completion for personal users. Saves interests, subcategories, dealbreakers and marks onboarding_complete=true in a single transaction.';

-- 4) Update handle_new_user to populate account_role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_role TEXT;
  existing_profile RECORD;
BEGIN
  -- Extract account type from auth metadata, default to 'user'
  account_role := COALESCE(NEW.raw_user_meta_data->>'accountType', 'user');
  
  -- Ensure role is valid (user or business_owner)
  IF account_role NOT IN ('user', 'business_owner') THEN
    account_role := 'user';
  END IF;

  -- Check if profile exists for this email
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_profile IS NOT NULL THEN
    -- Profile exists - update role to 'both' if adding different account type
    IF existing_profile."role" = 'user' AND account_role = 'business_owner' THEN
      UPDATE public.profiles
      SET "role" = 'both',
          updated_at = NOW()
      WHERE user_id = existing_profile.user_id;
    ELSIF existing_profile."role" = 'business_owner' AND account_role = 'user' THEN
      UPDATE public.profiles
      SET "role" = 'both',
          updated_at = NOW()
      WHERE user_id = existing_profile.user_id;
    END IF;
    -- If roles are the same or already 'both', do nothing
  ELSE
    -- No existing profile - create new one
    INSERT INTO public.profiles (
      user_id,
      email,
      "role",
      "account_role",
      onboarding_step,
      onboarding_complete,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      account_role,
      account_role,
      'interests',
      FALSE,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;
