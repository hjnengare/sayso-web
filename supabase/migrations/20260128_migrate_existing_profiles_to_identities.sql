-- =============================================
-- Migrate Existing Data to Dual Account Architecture
-- Date: 2025-01-28
-- Purpose: Populate account_identities for existing users and link profiles
-- =============================================

-- Step 1: Populate account_identities for existing profiles
-- This creates one identity record per existing user, maintaining their current state
INSERT INTO public.account_identities (
  id,
  auth_user_id,
  email,
  account_type,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  p.user_id,
  LOWER(TRIM(COALESCE(p.email, au.email))),
  COALESCE(p.account_type, p.role, 'personal'), -- Use account_type first, then role, fallback to personal
  COALESCE(p.created_at, NOW()),
  COALESCE(p.updated_at, NOW())
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE NOT EXISTS (
  -- Avoid duplicates - only insert if no identity exists for this email+type combo
  SELECT 1 FROM public.account_identities ai
  WHERE ai.email = LOWER(TRIM(COALESCE(p.email, au.email)))
    AND ai.account_type = COALESCE(p.account_type, p.role, 'personal')
)
ON CONFLICT (email, account_type) DO NOTHING;

-- Step 2: Update profiles with account_identity_id
-- This links each profile to its corresponding account_identity
UPDATE public.profiles p
SET account_identity_id = (
  SELECT ai.id
  FROM public.account_identities ai
  WHERE ai.auth_user_id = p.user_id
    AND ai.email = LOWER(TRIM(COALESCE(p.email, (
      SELECT email FROM auth.users WHERE id = p.user_id
    ))))
    AND ai.account_type = COALESCE(p.account_type, p.role, 'personal')
  LIMIT 1
)
WHERE p.account_identity_id IS NULL;

-- Step 3: Ensure account_type is set on all profiles
UPDATE public.profiles
SET account_type = COALESCE(account_type, role, 'personal')
WHERE account_type IS NULL OR account_type = '';

-- Step 4: Set email on all profiles (from auth.users if not set)
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id
  AND (p.email IS NULL OR TRIM(p.email) = '');

-- Step 5: Validate that all profiles have account_identity_id
-- This query should return 0 rows after migration
SELECT COUNT(*) as orphaned_profiles
FROM public.profiles
WHERE account_identity_id IS NULL;

-- Step 6: Log migration statistics
-- Count of migrated identities
SELECT 
  COUNT(DISTINCT email) as unique_emails,
  COUNT(DISTINCT auth_user_id) as unique_auth_users,
  COUNT(*) as total_identities,
  
  -- Count by account type
  (SELECT COUNT(*) FROM public.account_identities WHERE account_type = 'personal') as personal_accounts,
  (SELECT COUNT(*) FROM public.account_identities WHERE account_type = 'business') as business_accounts
FROM public.account_identities;

-- Step 7: Verify no profile is orphaned (all have account_identity_id set)
-- This should return 0
SELECT COUNT(*) as profiles_without_identity
FROM public.profiles
WHERE account_identity_id IS NULL;

-- Step 8: Verify email consistency between auth.users, account_identities, and profiles
-- Check for any mismatches
SELECT 
  p.user_id,
  p.email as profile_email,
  au.email as auth_email,
  ai.email as identity_email,
  CASE 
    WHEN p.email = au.email AND au.email = ai.email THEN 'OK'
    ELSE 'MISMATCH'
  END as email_status
FROM public.profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
LEFT JOIN public.account_identities ai ON p.account_identity_id = ai.id
WHERE (p.email != au.email OR au.email != ai.email)
LIMIT 10;

-- Step 9: Verify account_type consistency
SELECT 
  p.user_id,
  p.account_type as profile_type,
  ai.account_type as identity_type,
  CASE 
    WHEN p.account_type = ai.account_type THEN 'OK'
    ELSE 'MISMATCH'
  END as type_status
FROM public.profiles p
LEFT JOIN public.account_identities ai ON p.account_identity_id = ai.id
WHERE p.account_type != ai.account_type
LIMIT 10;

-- =============================================
-- Post-Migration Verification
-- =============================================

-- Verify the migration was successful by checking:
-- 1. All profiles have account_identity_id
-- 2. All account_identities have matching profiles
-- 3. Email consistency maintained
-- 4. No duplicate identities created

-- If any of these checks fail, investigate before proceeding to production

-- Check 1: Profiles with account_identity_id
SELECT COUNT(*) as profiles_with_identity FROM public.profiles WHERE account_identity_id IS NOT NULL;
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Check 2: Account identities with corresponding profiles
SELECT COUNT(*) as identities_with_profile
FROM public.account_identities ai
WHERE EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.account_identity_id = ai.id
);
SELECT COUNT(*) as total_identities FROM public.account_identities;

-- Check 3: Unique email + account_type combinations (should all be 1)
SELECT email, account_type, COUNT(*) as duplicate_count
FROM public.account_identities
GROUP BY email, account_type
HAVING COUNT(*) > 1;

-- =============================================
-- Rollback Instructions (if needed)
-- =============================================
/*

If the migration fails or needs to be rolled back:

1. Remove account_identity_id from profiles that were just linked:
   UPDATE public.profiles
   SET account_identity_id = NULL
   WHERE account_identity_id IS NOT NULL
     AND created_at < NOW() - INTERVAL '1 minute';

2. Delete account_identities that were just created:
   DELETE FROM public.account_identities
   WHERE created_at > NOW() - INTERVAL '5 minutes';

3. Review error logs to identify what went wrong

4. Re-run the migration after fixes

*/
