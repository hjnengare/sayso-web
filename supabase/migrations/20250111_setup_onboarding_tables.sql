-- =============================================
-- ONBOARDING TABLES AND FUNCTIONS MIGRATION
-- =============================================
-- This migration ensures all onboarding tables, RLS policies, and functions exist
-- Run this in your Supabase SQL editor to set up the onboarding system

-- =============================================
-- STEP 1: ENSURE PROFILES TABLE HAS ONBOARDING COLUMNS
-- =============================================

-- Add onboarding columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'interests',
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS interests_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subcategories_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dealbreakers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interests_updated TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_subcategories_updated TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_dealbreakers_updated TIMESTAMPTZ;

-- =============================================
-- STEP 2: CREATE ONBOARDING TABLES
-- =============================================

-- Create user_interests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, interest_id)
);

-- Create user_subcategories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_subcategories (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subcategory_id TEXT NOT NULL,
  interest_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, subcategory_id)
);

-- Create user_dealbreakers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_dealbreakers (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dealbreaker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, dealbreaker_id)
);

-- =============================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subcategories_user_id ON public.user_subcategories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subcategories_interest_id ON public.user_subcategories(interest_id);
CREATE INDEX IF NOT EXISTS idx_user_dealbreakers_user_id ON public.user_dealbreakers(user_id);

-- =============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dealbreakers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 5: CREATE RLS POLICIES
-- =============================================

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users can manage their own interests" ON public.user_interests;
DROP POLICY IF EXISTS "Users can manage their own subcategories" ON public.user_subcategories;
DROP POLICY IF EXISTS "Users can manage their own dealbreakers" ON public.user_dealbreakers;

-- Create RLS policies for user_interests
CREATE POLICY "Users can manage their own interests"
  ON public.user_interests
  FOR ALL
  USING (auth.uid() = user_id);

-- Create RLS policies for user_subcategories
CREATE POLICY "Users can manage their own subcategories"
  ON public.user_subcategories
  FOR ALL
  USING (auth.uid() = user_id);

-- Create RLS policies for user_dealbreakers
CREATE POLICY "Users can manage their own dealbreakers"
  ON public.user_dealbreakers
  FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- =============================================

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

-- =============================================
-- STEP 7: CREATE ATOMIC ONBOARDING COMPLETION FUNCTION
-- =============================================

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
-- STEP 8: GRANT PERMISSIONS
-- =============================================

-- Grant necessary permissions (if using service role, these may not be needed)
-- But ensure authenticated users can use the functions
GRANT EXECUTE ON FUNCTION public.replace_user_interests(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_subcategories(UUID, JSONB[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_dealbreakers(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding_atomic(UUID, TEXT[], JSONB[], TEXT[]) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- All onboarding tables, RLS policies, and functions are now set up
-- Users can now save their onboarding data through the API

