-- =============================================
-- FIX ONBOARDING RPC FUNCTIONS TO BE TRULY ATOMIC
-- =============================================
-- Problem: RPC functions update counts but not onboarding_step
-- This causes race conditions where guards see stale state
-- Solution: Make each RPC function advance onboarding_step atomically

-- =============================================
-- 1. UPDATE replace_user_interests TO ADVANCE STEP
-- =============================================

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS public.replace_user_interests(UUID, TEXT[]);

CREATE OR REPLACE FUNCTION public.replace_user_interests(
  p_user_id UUID,
  p_interest_ids TEXT[]
)
RETURNS TABLE(
  onboarding_step TEXT,
  onboarding_complete BOOLEAN,
  interests_count INTEGER,
  subcategories_count INTEGER,
  dealbreakers_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_result RECORD;
BEGIN
  -- Delete existing interests
  DELETE FROM public.user_interests WHERE user_id = p_user_id;

  -- Insert new interests
  v_count := COALESCE(array_length(p_interest_ids, 1), 0);

  IF v_count > 0 THEN
    INSERT INTO public.user_interests (user_id, interest_id)
    SELECT p_user_id, unnest(p_interest_ids);
  END IF;

  -- Atomically update profile with counts AND advance step to subcategories
  UPDATE public.profiles
  SET
    interests_count = v_count,
    last_interests_updated = NOW(),
    onboarding_step = 'subcategories', -- ✅ Advance step atomically
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING
    profiles.onboarding_step,
    profiles.onboarding_complete,
    profiles.interests_count,
    profiles.subcategories_count,
    profiles.dealbreakers_count
  INTO v_result;

  -- Return the updated state
  RETURN QUERY
  SELECT
    v_result.onboarding_step,
    v_result.onboarding_complete,
    v_result.interests_count,
    v_result.subcategories_count,
    v_result.dealbreakers_count;
END;
$$;

-- =============================================
-- 2. UPDATE replace_user_subcategories TO ADVANCE STEP
-- =============================================

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS public.replace_user_subcategories(UUID, JSONB[]);

CREATE OR REPLACE FUNCTION public.replace_user_subcategories(
  p_user_id UUID,
  p_subcategory_data JSONB[]
)
RETURNS TABLE(
  onboarding_step TEXT,
  onboarding_complete BOOLEAN,
  interests_count INTEGER,
  subcategories_count INTEGER,
  dealbreakers_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_result RECORD;
BEGIN
  -- Delete existing subcategories
  DELETE FROM public.user_subcategories WHERE user_id = p_user_id;

  -- Insert new subcategories
  v_count := COALESCE(array_length(p_subcategory_data, 1), 0);

  IF v_count > 0 THEN
    INSERT INTO public.user_subcategories (user_id, subcategory_id, interest_id)
    SELECT
      p_user_id,
      (item->>'subcategory_id')::TEXT,
      (item->>'interest_id')::TEXT
    FROM unnest(p_subcategory_data) AS item;
  END IF;

  -- Atomically update profile with counts AND advance step to deal-breakers
  UPDATE public.profiles
  SET
    subcategories_count = v_count,
    last_subcategories_updated = NOW(),
    onboarding_step = 'deal-breakers', -- ✅ Advance step atomically
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING
    profiles.onboarding_step,
    profiles.onboarding_complete,
    profiles.interests_count,
    profiles.subcategories_count,
    profiles.dealbreakers_count
  INTO v_result;

  -- Return the updated state
  RETURN QUERY
  SELECT
    v_result.onboarding_step,
    v_result.onboarding_complete,
    v_result.interests_count,
    v_result.subcategories_count,
    v_result.dealbreakers_count;
END;
$$;

-- =============================================
-- 3. UPDATE replace_user_dealbreakers TO ADVANCE STEP AND COMPLETE
-- =============================================

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS public.replace_user_dealbreakers(UUID, TEXT[]);

CREATE OR REPLACE FUNCTION public.replace_user_dealbreakers(
  p_user_id UUID,
  p_dealbreaker_ids TEXT[]
)
RETURNS TABLE(
  onboarding_step TEXT,
  onboarding_complete BOOLEAN,
  interests_count INTEGER,
  subcategories_count INTEGER,
  dealbreakers_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_result RECORD;
BEGIN
  -- Delete existing dealbreakers
  DELETE FROM public.user_dealbreakers WHERE user_id = p_user_id;

  -- Insert new dealbreakers
  v_count := COALESCE(array_length(p_dealbreaker_ids, 1), 0);

  IF v_count > 0 THEN
    INSERT INTO public.user_dealbreakers (user_id, dealbreaker_id)
    SELECT p_user_id, unnest(p_dealbreaker_ids);
  END IF;

  -- Atomically update profile with counts AND mark complete
  UPDATE public.profiles
  SET
    dealbreakers_count = v_count,
    last_dealbreakers_updated = NOW(),
    onboarding_step = 'complete', -- ✅ Advance to complete atomically
    onboarding_complete = TRUE,   -- ✅ Mark as complete
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING
    profiles.onboarding_step,
    profiles.onboarding_complete,
    profiles.interests_count,
    profiles.subcategories_count,
    profiles.dealbreakers_count
  INTO v_result;

  -- Return the updated state
  RETURN QUERY
  SELECT
    v_result.onboarding_step,
    v_result.onboarding_complete,
    v_result.interests_count,
    v_result.subcategories_count,
    v_result.dealbreakers_count;
END;
$$;

-- =============================================
-- 4. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION public.replace_user_interests(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_subcategories(UUID, JSONB[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_dealbreakers(UUID, TEXT[]) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- RPC functions now atomically:
-- 1. Delete old selections
-- 2. Insert new selections
-- 3. Update counts
-- 4. Advance onboarding_step
-- 5. Return fresh state
--
-- This eliminates race conditions where guards see:
-- - counts updated but step not advanced
-- - step advanced but counts not updated
