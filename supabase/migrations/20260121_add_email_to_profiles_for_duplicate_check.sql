-- Add email column to profiles table for duplicate account type checking
-- This allows us to check if an email already has a specific account type (Personal or Business)

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add account_role column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'account_role') THEN
    ALTER TABLE public.profiles ADD COLUMN "account_role" TEXT DEFAULT 'user';
  END IF;
END $$;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create composite index on email and role for duplicate checking
CREATE INDEX IF NOT EXISTS idx_profiles_email_role ON public.profiles(email, "role");

-- Update existing profiles to populate email from auth.users
-- This is a one-time sync for existing users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.user_id = auth.users.id
  AND profiles.email IS NULL;

-- Update the handle_new_user trigger to also set email
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate function with email support
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

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON COLUMN public.profiles.email IS 'User email address for duplicate account type checking. Allows same email to have both Personal and Business accounts.';

