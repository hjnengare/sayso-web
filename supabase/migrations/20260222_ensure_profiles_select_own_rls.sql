-- Ensure middleware/session-bound queries can read the current user's profile.
-- This policy is idempotent and keeps least-privilege scope to auth.uid() = user_id.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_select_own'
  ) THEN
    CREATE POLICY "profiles_select_own"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

GRANT SELECT ON public.profiles TO authenticated;
