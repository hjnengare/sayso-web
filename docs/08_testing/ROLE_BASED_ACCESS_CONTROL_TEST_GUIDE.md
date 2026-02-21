# Role-Based Access Control - Quick Test Guide

## Prerequisites
1. The migration `20260120_update_handle_new_user_for_account_type.sql` must be applied to Supabase
2. Restart the app after migration

## Test Scenarios

### Scenario 1: Personal User Registration & Flow
**Steps:**
1. Go to `/onboarding`
2. Click "Sign Up"
3. Register with:
   - Account Type: **Personal User** (default)
   - Username: `testuser1`
   - Email: `testuser1@example.com`
   - Password: `TestPassword123`
4. Click "Register"

**Expected Results:**
- ✓ Verification email sent
- ✓ Redirected to `/verify-email` page
- ✓ After email verification, redirected to `/interests`
- ✓ Complete onboarding: interests → subcategories → deal-breakers → complete
- ✓ Final redirect to `/home`
- ✓ Header shows: "Messages", "Saved", "Profile"
- ✓ Header does NOT show: "For Businesses", "My Businesses"

**Access Tests:**
- ✓ `/home` - accessible
- ✓ `/for-you` - accessible
- ✓ `/trending` - accessible
- ✓ `/profile` - accessible
- ✓ `/saved` - accessible
- ✓ `/dm` - accessible
- ✗ `/for-businesses` - redirects to `/home`
- ✗ `/interests` (after onboarding complete) - redirects to `/home`
- ✗ `/my-businesses` - redirects to `/home`

### Scenario 2: Business Owner Registration & Flow
**Steps:**
1. Go to `/onboarding`
2. Click "Sign Up"
3. Register with:
   - Account Type: **Business Owner**
   - Username: `testbiz1`
   - Email: `testbiz1@example.com`
   - Password: `TestPassword123`
4. Click "Register"

**Expected Results:**
- ✓ Verification email sent
- ✓ Redirected to `/verify-email` page
- ✓ After email verification, redirected directly to `/for-businesses`
- ✓ **Skips personal onboarding** (no /interests, /subcategories, etc.)
- ✓ Header shows: "For Businesses", "My Businesses", "Profile"
- ✓ Header does NOT show: "Messages", "Saved" (personal items)

**Access Tests:**
- ✓ `/for-businesses` - accessible
- ✓ `/my-businesses` - accessible
- ✓ `/profile` - accessible
- ✗ `/interests` - redirects to `/for-businesses`
- ✗ `/subcategories` - redirects to `/for-businesses`
- ✗ `/deal-breakers` - redirects to `/for-businesses`
- ✗ `/for-you` - redirects to `/for-businesses`
- ✗ `/saved` - redirects to `/for-businesses`
- ✗ `/dm` - redirects to `/for-businesses`
- ✗ `/home` - redirects to `/for-businesses`

### Scenario 3: Personal User Login
**Steps:**
1. Use account from Scenario 1: `testuser1@example.com`
2. Go to `/login`
3. Enter email and password
4. Click "Log In"

**Expected Results:**
- ✓ Successfully logged in
- ✓ Redirected to `/home` (dashboard)
- ✓ Navigation shows personal user routes
- ✓ Same access restrictions as Scenario 1 apply

### Scenario 4: Business Owner Login
**Steps:**
1. Use account from Scenario 2: `testbiz1@example.com`
2. Go to `/login`
3. Enter email and password
4. Click "Log In"

**Expected Results:**
- ✓ Successfully logged in
- ✓ Redirected to `/for-businesses` (dashboard)
- ✓ Navigation shows business owner routes
- ✓ Same access restrictions as Scenario 2 apply

### Scenario 5: Cross-Role Access Prevention
**For Personal User (from Scenario 1):**
1. Try direct navigation: `/for-businesses`
   - ✗ Should redirect to `/home`
2. Try direct navigation: `/my-businesses`
   - ✗ Should redirect to `/home`

**For Business Owner (from Scenario 2):**
1. Try direct navigation: `/for-you`
   - ✗ Should redirect to `/for-businesses`
2. Try direct navigation: `/saved`
   - ✗ Should redirect to `/for-businesses`
3. Try direct navigation: `/home`
   - ✗ Should redirect to `/for-businesses`

## Console Checks

Open browser DevTools → Console tab and look for middleware logs:

**Expected Personal User Flow:**
```
Middleware: [role-based access check logs]
[No cross-role access errors]
```

**Expected Business Owner Flow:**
```
Middleware: Restricting business account from personal onboarding
Middleware: [role-based redirect to /for-businesses]
```

## Database Verification

In Supabase SQL Editor:

```sql
-- Check personal user profile
SELECT user_id, role, onboarding_complete FROM profiles 
WHERE email = 'testuser1@example.com' LIMIT 1;
-- Should show: role = 'user'

-- Check business owner profile
SELECT user_id, role, onboarding_complete FROM profiles 
WHERE email = 'testbiz1@example.com' LIMIT 1;
-- Should show: role = 'business_owner'
```

## Common Issues

### Issue: Redirect loop or blank page
**Solution:** 
- Clear browser cache
- Check if migration was applied
- Verify auth cookies are set (check Application tab in DevTools)

### Issue: Email verification not working
**Solution:**
- Check Supabase email settings
- Look at auth.users table to verify email_confirmed_at
- Manually update for testing: `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'test@example.com'`

### Issue: Profile role is NULL
**Solution:**
- Migration not applied yet
- Manually set: `UPDATE profiles SET role = 'user' WHERE role IS NULL`
- Restart app

### Issue: Header not showing role-specific items
**Solution:**
- Check if user?.profile?.role is populated
- Force refresh (Ctrl+Shift+R)
- Check browser console for errors

## Sign-Out & Switch Account

**To test switching between account types:**
1. Log out (click profile → Sign Out)
2. Clear browser cache/cookies (optional but recommended)
3. Register with different account type
4. Verify new role and redirects work correctly

## Performance Notes

- Single database query per middleware execution for profile data
- Role-based navigation uses client-side conditional rendering
- No extra API calls for role verification
- Middleware caches profile data for reuse

## Success Criteria

✓ Personal users see only personal features
✓ Business users see only business features
✓ Cross-role access is blocked at middleware level
✓ Redirects are automatic and user-friendly
✓ No duplicate auth flows
✓ Navigation accurately reflects user role
✓ Both flows complete onboarding → dashboard correctly
