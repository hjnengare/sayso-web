-- Update handle_new_user trigger to set initial role based on accountType from auth metadata
-- This allows one email to have both personal ('user') and business ('business_owner') roles
-- Add account_role field to track which mode the user is actively using

-- Drop trigger first (depends on function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add account_role column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_role TEXT DEFAULT 'user';

-- Recreate function with role support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_role TEXT;
BEGIN
  -- Extract account type from auth metadata, default to 'user'
  account_role := COALESCE(NEW.raw_user_meta_data->>'accountType', 'user');
  
  -- Ensure role is valid (user or business_owner)
  IF account_role NOT IN ('user', 'business_owner') THEN
    account_role := 'user';
  END IF;

  INSERT INTO public.profiles (
    user_id,
    role,
    account_role,
    onboarding_step,
    onboarding_complete,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    account_role,
    account_role,
    'interests',
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = CASE 
      WHEN EXCLUDED.role = 'user' AND profiles.role = 'business_owner' THEN 'both'
      WHEN EXCLUDED.role = 'business_owner' AND profiles.role = 'user' THEN 'both'
      ELSE EXCLUDED.role
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Recreate trigger with updated function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

