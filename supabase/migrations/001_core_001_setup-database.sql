-- =============================================
-- sayso Database Setup Script
-- Run this FIRST in your Supabase SQL Editor
-- =============================================

-- =============================================
-- STEP 1: CREATE PROFILES TABLE
-- =============================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_step TEXT DEFAULT 'interests',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  interests_count INTEGER DEFAULT 0,
  subcategories_count INTEGER DEFAULT 0,
  dealbreakers_count INTEGER DEFAULT 0,
  last_interests_updated TIMESTAMPTZ,
  last_subcategories_updated TIMESTAMPTZ,
  last_dealbreakers_updated TIMESTAMPTZ,
  avatar_url TEXT,
  username TEXT UNIQUE,
  display_name TEXT,
  locale TEXT DEFAULT 'en',
  is_top_reviewer BOOLEAN DEFAULT FALSE,
  reviews_count INTEGER DEFAULT 0,
  badges_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 2: CREATE AUTO-PROFILE TRIGGER
-- =============================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    onboarding_step,
    onboarding_complete,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'interests',
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 3: ENABLE RLS ON PROFILES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

-- Create RLS policy for profiles
CREATE POLICY "Users can manage their own profile"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- STEP 4: CREATE INTEREST/SUBCATEGORY TABLES
-- =============================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.user_interests CASCADE;
DROP TABLE IF EXISTS public.user_subcategories CASCADE;
DROP TABLE IF EXISTS public.user_dealbreakers CASCADE;

-- Create user_interests table
CREATE TABLE public.user_interests (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, interest_id)
);

-- Create user_subcategories table
CREATE TABLE public.user_subcategories (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subcategory_id TEXT NOT NULL,
  interest_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, subcategory_id)
);

-- Create user_dealbreakers table
CREATE TABLE public.user_dealbreakers (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dealbreaker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, dealbreaker_id)
);


-- =============================================
-- STEP 5: ENABLE RLS ON USER TABLES
-- =============================================

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dealbreakers ENABLE ROW LEVEL SECURITY;


-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own interests" ON public.user_interests;
DROP POLICY IF EXISTS "Users can manage their own subcategories" ON public.user_subcategories;
DROP POLICY IF EXISTS "Users can manage their own dealbreakers" ON public.user_dealbreakers;

-- Create RLS policies
CREATE POLICY "Users can manage their own interests"
  ON public.user_interests
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subcategories"
  ON public.user_subcategories
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own dealbreakers"
  ON public.user_dealbreakers
  FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- =============================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.replace_user_interests(UUID, TEXT[]);
DROP FUNCTION IF EXISTS public.replace_user_subcategories(UUID, JSONB[]);
DROP FUNCTION IF EXISTS public.replace_user_dealbreakers(UUID, TEXT[]);
DROP FUNCTION IF EXISTS public.complete_onboarding_atomic(UUID, TEXT[], JSONB[], TEXT[]);

-- Function to replace user interests
CREATE OR REPLACE FUNCTION public.replace_user_interests(
  p_user_id UUID,
  p_interest_ids TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing interests
  DELETE FROM public.user_interests WHERE user_id = p_user_id;

  -- Insert new interests
  IF array_length(p_interest_ids, 1) > 0 THEN
    INSERT INTO public.user_interests (user_id, interest_id)
    SELECT p_user_id, unnest(p_interest_ids);
  END IF;

  -- Update profile metadata
  UPDATE public.profiles
  SET
    interests_count = COALESCE(array_length(p_interest_ids, 1), 0),
    last_interests_updated = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Function to replace user subcategories
CREATE OR REPLACE FUNCTION public.replace_user_subcategories(
  p_user_id UUID,
  p_subcategory_data JSONB[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing subcategories
  DELETE FROM public.user_subcategories WHERE user_id = p_user_id;

  -- Insert new subcategories
  IF array_length(p_subcategory_data, 1) > 0 THEN
    INSERT INTO public.user_subcategories (user_id, subcategory_id, interest_id)
    SELECT
      p_user_id,
      (item->>'subcategory_id')::TEXT,
      (item->>'interest_id')::TEXT
    FROM unnest(p_subcategory_data) AS item;
  END IF;

  -- Update profile metadata
  UPDATE public.profiles
  SET
    subcategories_count = COALESCE(array_length(p_subcategory_data, 1), 0),
    last_subcategories_updated = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Function to replace user dealbreakers
CREATE OR REPLACE FUNCTION public.replace_user_dealbreakers(
  p_user_id UUID,
  p_dealbreaker_ids TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing dealbreakers
  DELETE FROM public.user_dealbreakers WHERE user_id = p_user_id;

  -- Insert new dealbreakers
  IF array_length(p_dealbreaker_ids, 1) > 0 THEN
    INSERT INTO public.user_dealbreakers (user_id, dealbreaker_id)
    SELECT p_user_id, unnest(p_dealbreaker_ids);
  END IF;

  -- Update profile metadata
  UPDATE public.profiles
  SET
    dealbreakers_count = COALESCE(array_length(p_dealbreaker_ids, 1), 0),
    last_dealbreakers_updated = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Atomic function to complete entire onboarding process
CREATE OR REPLACE FUNCTION public.complete_onboarding_atomic(
  p_user_id UUID,
  p_interest_ids TEXT[],
  p_subcategory_data JSONB[],
  p_dealbreaker_ids TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Start transaction for atomic operation
  
  -- 1. Clear existing data
  DELETE FROM public.user_interests WHERE user_id = p_user_id;
  DELETE FROM public.user_subcategories WHERE user_id = p_user_id;
  DELETE FROM public.user_dealbreakers WHERE user_id = p_user_id;
  
  -- 2. Insert interests
  IF array_length(p_interest_ids, 1) > 0 THEN
    INSERT INTO public.user_interests (user_id, interest_id)
    SELECT p_user_id, unnest(p_interest_ids);
  END IF;
  
  -- 3. Insert subcategories
  IF array_length(p_subcategory_data, 1) > 0 THEN
    INSERT INTO public.user_subcategories (user_id, subcategory_id, interest_id)
    SELECT
      p_user_id,
      (item->>'subcategory_id')::TEXT,
      (item->>'interest_id')::TEXT
    FROM unnest(p_subcategory_data) AS item;
  END IF;
  
  -- 4. Insert dealbreakers
  IF array_length(p_dealbreaker_ids, 1) > 0 THEN
    INSERT INTO public.user_dealbreakers (user_id, dealbreaker_id)
    SELECT p_user_id, unnest(p_dealbreaker_ids);
  END IF;
  
  -- 5. Update profile with final counts and completion status
  UPDATE public.profiles
  SET
    interests_count = COALESCE(array_length(p_interest_ids, 1), 0),
    subcategories_count = COALESCE(array_length(p_subcategory_data, 1), 0),
    dealbreakers_count = COALESCE(array_length(p_dealbreaker_ids, 1), 0),
    last_interests_updated = NOW(),
    last_subcategories_updated = NOW(),
    last_dealbreakers_updated = NOW(),
    onboarding_step = 'complete',
    onboarding_complete = TRUE,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
END;
$$;

-- =============================================
-- STEP 7: GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.replace_user_interests(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_subcategories(UUID, JSONB[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_dealbreakers(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding_atomic(UUID, TEXT[], JSONB[], TEXT[]) TO authenticated;

-- =============================================
-- SETUP COMPLETE
-- =============================================

-- Verify trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✅ Trigger "on_auth_user_created" successfully created';
  ELSE
    RAISE NOTICE '❌ Trigger "on_auth_user_created" NOT found';
  END IF;
END $$;
