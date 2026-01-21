-- sayso Database Functions
-- Run these in your Supabase SQL editor

-- =============================================
-- CREATE PROFILES TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_step TEXT DEFAULT 'interests',
  interests_count INTEGER DEFAULT 0,
  subcategories_count INTEGER DEFAULT 0,
  dealbreakers_count INTEGER DEFAULT 0,
  last_interests_updated TIMESTAMPTZ,
  last_subcategories_updated TIMESTAMPTZ,
  last_dealbreakers_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY IF NOT EXISTS "Users can manage their own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- CREATE TRIGGER FOR AUTO PROFILE CREATION
-- =============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, onboarding_step, created_at, updated_at)
  VALUES (NEW.id, 'interests', NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================
-- DROP OLD TABLES AND FUNCTIONS
-- =============================================

-- Drop existing tables
DROP TABLE IF EXISTS user_interests;
DROP TABLE IF EXISTS interests;

-- Drop existing functions
DROP FUNCTION IF EXISTS replace_user_interests(UUID, VARCHAR(50)[]);

-- =============================================
-- UPDATE PROFILES TABLE
-- =============================================

-- Remove array columns from profiles table
ALTER TABLE profiles 
DROP COLUMN IF EXISTS interests,
DROP COLUMN IF EXISTS sub_interests,
DROP COLUMN IF EXISTS dealbreakers;

-- Add new metadata columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS interests_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subcategories_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dealbreakers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interests_updated TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_subcategories_updated TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_dealbreakers_updated TIMESTAMPTZ;

-- Add profile fields for avatar, username, display name, etc.
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS is_top_reviewer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badges_count INTEGER DEFAULT 0;

-- =============================================
-- CREATE NEW SIMPLIFIED TABLES
-- =============================================

-- User interest selections (no foreign key to interests table)
CREATE TABLE user_interests (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id TEXT NOT NULL, -- Just store the string ID directly
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, interest_id)
);

-- User subcategory selections
CREATE TABLE user_subcategories (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subcategory_id TEXT NOT NULL,
  interest_id TEXT NOT NULL, -- Keep this to know which interest it belongs to
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, subcategory_id)
);

-- User dealbreaker selections
CREATE TABLE user_dealbreakers (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dealbreaker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, dealbreaker_id)
);

-- =============================================
-- CREATE USER REGISTRATION TRIGGER
-- =============================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, onboarding_step, onboarding_complete)
  VALUES (NEW.id, 'interests', FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- CREATE NEW ATOMIC FUNCTIONS
-- =============================================

-- Function to replace user interests
CREATE OR REPLACE FUNCTION replace_user_interests(
  p_user_id UUID,
  p_interest_ids TEXT[]
)
RETURNS VOID AS $$
BEGIN
  -- Delete existing interests
  DELETE FROM user_interests WHERE user_id = p_user_id;
  
  -- Insert new interests
  IF array_length(p_interest_ids, 1) > 0 THEN
    INSERT INTO user_interests (user_id, interest_id)
    SELECT p_user_id, unnest(p_interest_ids);
  END IF;
  
  -- Update profile metadata
  UPDATE profiles 
  SET 
    interests_count = array_length(p_interest_ids, 1),
    last_interests_updated = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to replace user subcategories
CREATE OR REPLACE FUNCTION replace_user_subcategories(
  p_user_id UUID,
  p_subcategory_data JSONB[] -- Array of {subcategory_id, interest_id}
)
RETURNS VOID AS $$
BEGIN
  -- Delete existing subcategories
  DELETE FROM user_subcategories WHERE user_id = p_user_id;
  
  -- Insert new subcategories
  IF array_length(p_subcategory_data, 1) > 0 THEN
    INSERT INTO user_subcategories (user_id, subcategory_id, interest_id)
    SELECT 
      p_user_id, 
      (item->>'subcategory_id')::TEXT,
      (item->>'interest_id')::TEXT
    FROM unnest(p_subcategory_data) AS item;
  END IF;
  
  -- Update profile metadata
  UPDATE profiles 
  SET 
    subcategories_count = array_length(p_subcategory_data, 1),
    last_subcategories_updated = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to replace user dealbreakers
CREATE OR REPLACE FUNCTION replace_user_dealbreakers(
  p_user_id UUID,
  p_dealbreaker_ids TEXT[]
)
RETURNS VOID AS $$
BEGIN
  -- Delete existing dealbreakers
  DELETE FROM user_dealbreakers WHERE user_id = p_user_id;
  
  -- Insert new dealbreakers
  IF array_length(p_dealbreaker_ids, 1) > 0 THEN
    INSERT INTO user_dealbreakers (user_id, dealbreaker_id)
    SELECT p_user_id, unnest(p_dealbreaker_ids);
  END IF;
  
  -- Update profile metadata
  UPDATE profiles 
  SET 
    dealbreakers_count = array_length(p_dealbreaker_ids, 1),
    last_dealbreakers_updated = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION replace_user_interests(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_user_subcategories(UUID, JSONB[]) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_user_dealbreakers(UUID, TEXT[]) TO authenticated;

-- Enable Row Level Security
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dealbreakers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own interests" ON user_interests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subcategories" ON user_subcategories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own dealbreakers" ON user_dealbreakers
  FOR ALL USING (auth.uid() = user_id);
