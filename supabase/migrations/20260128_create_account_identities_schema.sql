-- =============================================
-- Dual Account Architecture - Schema Migration
-- Date: 2025-01-28
-- Purpose: Enable same email for Personal & Business accounts
-- =============================================

-- Step 1: Create account_identities table
-- This is the new primary identity layer that sits between auth.users and profiles
CREATE TABLE IF NOT EXISTS public.account_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL, -- Denormalized for easier querying
  account_type TEXT NOT NULL CHECK (account_type IN ('personal', 'business')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one identity per email + account_type combo
  UNIQUE(email, account_type),
  
  -- Index for fast lookups by email
  -- Index for fast lookups by auth_user_id
  -- These will be created below
  CONSTRAINT valid_account_type CHECK (account_type IN ('personal', 'business'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_identities_email 
  ON public.account_identities(email);
  
CREATE INDEX IF NOT EXISTS idx_account_identities_auth_user_id 
  ON public.account_identities(auth_user_id);
  
CREATE INDEX IF NOT EXISTS idx_account_identities_email_type 
  ON public.account_identities(email, account_type);

-- Step 2: Add account_identity_id and account_type to profiles table
-- This connects profiles to account_identities instead of directly to auth.users

DO $$ 
BEGIN
  -- Add account_identity_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'account_identity_id'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN account_identity_id UUID REFERENCES public.account_identities(id) ON DELETE CASCADE;
  END IF;
  
  -- Add account_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN account_type TEXT DEFAULT 'personal' CHECK (account_type IN ('personal', 'business'));
  END IF;
END $$;

-- Step 3: Add email column to profiles if not present (for reference)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN email TEXT;
  END IF;
END $$;

-- Step 4: Ensure profiles table has proper indexes
CREATE INDEX IF NOT EXISTS idx_profiles_account_identity_id 
  ON public.profiles(account_identity_id);

CREATE INDEX IF NOT EXISTS idx_profiles_account_type 
  ON public.profiles(account_type);

-- Step 5: Update RLS policies for account_identities
ALTER TABLE public.account_identities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present
DROP POLICY IF EXISTS "Users can read their own account identities" ON public.account_identities;
DROP POLICY IF EXISTS "Users can read all identities for their email" ON public.account_identities;

-- Create RLS policy: Users can only access account_identities created with their auth.uid()
CREATE POLICY "Users can read their own account identities"
  ON public.account_identities
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Step 6: Update profiles RLS policies to check account_identities
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old profile policies that use user_id directly
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

-- Create new RLS policy using account_identities
CREATE POLICY "Users can read/update their account profiles"
  ON public.profiles
  FOR ALL
  USING (
    account_identity_id IN (
      SELECT id FROM public.account_identities
      WHERE auth_user_id = auth.uid()
    )
  );

-- Step 7: Create helper function to get user's account identities
CREATE OR REPLACE FUNCTION public.get_user_account_identities(p_auth_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  email TEXT,
  account_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    account_identities.id,
    account_identities.email,
    account_identities.account_type,
    account_identities.created_at
  FROM public.account_identities
  WHERE account_identities.auth_user_id = COALESCE(p_auth_user_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_account_identities(UUID) TO authenticated;

-- Step 8: Create helper function to get or create account_identity
CREATE OR REPLACE FUNCTION public.get_or_create_account_identity(
  p_email TEXT,
  p_account_type TEXT DEFAULT 'personal'
)
RETURNS UUID AS $$
DECLARE
  v_identity_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Get the current user's auth.uid()
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate account_type
  IF p_account_type NOT IN ('personal', 'business') THEN
    RAISE EXCEPTION 'Invalid account_type: %', p_account_type;
  END IF;
  
  -- Check if identity already exists for this email + account_type
  SELECT id INTO v_identity_id
  FROM public.account_identities
  WHERE email = LOWER(TRIM(p_email))
    AND account_type = p_account_type;
  
  IF v_identity_id IS NOT NULL THEN
    RETURN v_identity_id;
  END IF;
  
  -- Create new identity
  INSERT INTO public.account_identities (
    auth_user_id,
    email,
    account_type,
    created_at,
    updated_at
  )
  VALUES (
    v_auth_user_id,
    LOWER(TRIM(p_email)),
    p_account_type,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_identity_id;
  
  RETURN v_identity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_account_identity(TEXT, TEXT) TO authenticated;

-- Step 9: Update handle_new_user trigger to use account_identities
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_role TEXT;
  v_account_identity_id UUID;
BEGIN
  -- Extract account type from auth metadata, default to 'personal'
  account_role := COALESCE(NEW.raw_user_meta_data->>'accountType', 'personal');
  
  -- Ensure role is valid
  IF account_role NOT IN ('personal', 'business') THEN
    account_role := 'personal';
  END IF;

  -- Create account_identity for this email + account_type
  INSERT INTO public.account_identities (
    auth_user_id,
    email,
    account_type,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    account_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (email, account_type) DO UPDATE
  SET updated_at = NOW()
  RETURNING id INTO v_account_identity_id;

  -- Create profile linked to account_identity
  INSERT INTO public.profiles (
    user_id,
    account_identity_id,
    email,
    account_type,
    current_role,
    onboarding_step,
    onboarding_complete,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_account_identity_id,
    LOWER(TRIM(NEW.email)),
    account_role,
    account_role,
    'interests',
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    account_identity_id = EXCLUDED.account_identity_id,
    account_type = EXCLUDED.account_type,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Step 10: Add comment documenting the new schema
COMMENT ON TABLE public.account_identities IS 
'Central identity table for multi-account support. Each row represents one account (personal or business) 
for an email address. Multiple accounts can exist for the same email with different account_types.
This enables users to have separate personal and business accounts using the same email.';

COMMENT ON COLUMN public.account_identities.auth_user_id IS 
'Reference to Supabase auth.users. Multiple identities can reference the same auth_user_id 
(representing the same underlying authentication, but different account contexts).';

COMMENT ON COLUMN public.account_identities.email IS 
'Email address for this account identity. Denormalized for faster querying.';

COMMENT ON COLUMN public.account_identities.account_type IS 
'Type of account: personal (user profile) or business (business owner profile).';

COMMENT ON COLUMN public.profiles.account_identity_id IS 
'Reference to account_identities table. This replaces the direct user_id relationship 
to support multiple account types per email.';

COMMENT ON COLUMN public.profiles.account_type IS 
'Denormalized account_type from account_identities for easier querying. Should match the linked account_identity.';

-- Step 11: Create audit function to track account type changes
CREATE OR REPLACE FUNCTION public.audit_account_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
    -- Log this change if an audit table exists
    -- For now, just update the updated_at timestamp
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Add metadata columns for account switching
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_account_switch'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN last_account_switch TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'account_switch_count'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN account_switch_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create index for faster lookups of profiles by account type
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_account_type 
  ON public.profiles(user_id, account_type);

-- =============================================
-- Summary of Changes
-- =============================================
/*
NEW TABLE: account_identities
- Represents the identity layer between auth.users and profiles
- One row per email + account_type combination
- Allows multiple accounts per email (personal + business)
- Links to auth.users via auth_user_id

MODIFIED: profiles
- Added account_identity_id (foreign key to account_identities)
- Added account_type (personal or business)
- Added last_account_switch, account_switch_count for tracking
- RLS policies updated to check account_identities

KEY BENEFIT:
- Same email can have both personal and business accounts
- Accounts are completely independent with separate roles, permissions, and data
- Switching between accounts is seamless for the user (same auth_user_id, different context)

MIGRATION NEEDED:
- For existing users, create account_identity records linking them to profiles
- Update profiles with account_identity_id references
- (See separate migration file: 20260128_migrate_existing_profiles_to_identities.sql)
*/
