# User Logic Edge Cases

This document outlines all identified edge cases, potential issues, and boundary conditions in user-related functionality including authentication, profiles, account management, and user data.

## 1. User Registration Edge Cases

### 1.1 Username Generation Infinite Loop
**Location:** `supabase/migrations/update_profile_trigger_for_username.sql:38-44`

**Issue:** The username generation in the database trigger uses a `WHILE EXISTS` loop without a maximum iteration limit. If many users have similar emails, this could theoretically run indefinitely.

**Current Code:**
```sql
WHILE EXISTS (SELECT 1 FROM profiles WHERE username = user_username) LOOP
  user_username := user_username || '_' || FLOOR(RANDOM() * 1000)::TEXT;
  -- Prevent infinite loop by limiting length
  IF LENGTH(user_username) > 20 THEN
    user_username := SUBSTRING(user_username, 1, 17) || '_' || FLOOR(RANDOM() * 100)::TEXT;
  END IF;
END LOOP;
```

**Risk:** Medium - Could cause database timeout or infinite loop
**Mitigation:** Add maximum iteration counter (e.g., 100) and fallback to UUID-based username

### 1.2 Email Validation After Trim
**Location:** `src/app/register/page.tsx:137-142`, `src/app/components/Register/RegisterForm.tsx:211-216`

**Issue:** Validation checks `!email?.trim()` but doesn't validate if email becomes empty after trim. Also, email length validation (254 chars) happens after trim, which is correct, but should be consistent.

**Current Code:**
```typescript
if (!username?.trim() || !email?.trim() || !password?.trim()) {
  setError("Please fill in all fields");
  return;
}
```

**Risk:** Low - Already handled by trim, but should be explicit
**Mitigation:** Validate `email.trim().length > 0` explicitly

### 1.3 Username Validation Inconsistency
**Location:** Multiple locations

**Issue:** Username validation regex differs between:
- Frontend: `/^[a-zA-Z0-9_-]{3,20}$/` (allows hyphens)
- Database: `username ~ '^[a-zA-Z0-9_]{3,20}$'` (no hyphens)
- EditProfileModal: `/^[a-zA-Z0-9_-]{3,20}$/` (allows hyphens)

**Risk:** Medium - Users could create usernames with hyphens that fail database validation
**Mitigation:** Align all validations to use the same regex pattern

### 1.4 Profile Creation Failure After Auth User Creation
**Location:** `supabase/migrations/005_functions/001_database-functions.sql:33-40`

**Issue:** If profile creation fails after `auth.users` is created, the user exists in auth but has no profile. The trigger uses `ON CONFLICT DO NOTHING`, which silently fails.

**Current Code:**
```sql
INSERT INTO public.profiles (user_id, onboarding_step, created_at, updated_at)
VALUES (NEW.id, 'interests', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;
```

**Risk:** Medium - User could be created without profile, causing errors in profile-dependent features
**Mitigation:** Add error logging and retry mechanism, or use transaction

### 1.5 Email Already in Use Detection
**Location:** `src/app/lib/auth.ts:396-417`, `src/app/contexts/AuthContext.tsx:174-182`

**Issue:** Multiple checks for "email already in use" but relies on string matching which could miss edge cases or new error message formats from Supabase.

**Risk:** Low - Comprehensive checks exist, but could miss new error formats
**Mitigation:** Monitor for new error codes from Supabase and update accordingly

## 2. User Authentication Edge Cases

### 2.1 Rate Limiting Not Enforced
**Location:** `docs/02_architecture/AUTH_PRODUCTION_READINESS.md:40`

**Issue:** Rate limiting infrastructure exists but is NOT actively enforced in all login/register flows. Some flows check rate limits, but not consistently.

**Risk:** High - Vulnerable to brute force attacks
**Mitigation Needed:** Ensure rate limiting is enforced in ALL authentication endpoints

### 2.2 Session Expiration Handling
**Location:** Various auth flows

**Issue:** No explicit handling for expired sessions. Users might get generic errors instead of being redirected to login.

**Risk:** Medium - Poor user experience
**Mitigation:** Add session expiration checks and automatic redirect to login

### 2.3 Concurrent Login Attempts
**Location:** `src/app/login/page.tsx:88-105`

**Issue:** Multiple login attempts from the same user could race condition the rate limit counter.

**Risk:** Low - Rate limiter should handle this, but should verify
**Mitigation:** Ensure rate limiter uses atomic operations

### 2.4 Password Reset Token Expiration
**Location:** `src/app/reset-password/page.tsx:46-100`

**Issue:** No explicit check for token expiration. Relies on Supabase session validation, but error messages might not be clear.

**Current Code:**
```typescript
if (sessionError) {
  setError("Invalid or expired reset link. Please request a new one.");
  return;
}
```

**Risk:** Low - Handled, but could be more specific
**Mitigation:** Check token expiration explicitly and provide clearer error messages

### 2.5 Email Verification Token Reuse
**Location:** `src/app/auth/callback/route.ts:86-102`

**Issue:** No check to prevent reuse of email verification tokens. If a user clicks the same verification link twice, it might cause issues.

**Risk:** Low - Supabase likely handles this, but should verify
**Mitigation:** Verify Supabase behavior and handle duplicate verification gracefully

## 3. Profile Management Edge Cases

### 3.1 Username Update Race Condition
**Location:** `src/app/lib/services/userService.ts:109-143`

**Issue:** When updating username, no check for concurrent updates. Two users could try to claim the same username simultaneously.

**Current Code:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .update(updateData)
  .eq('user_id', userId)
  .select()
  .single();
```

**Risk:** Medium - Could allow duplicate usernames if unique constraint not enforced
**Mitigation:** Database unique constraint should prevent this, but add explicit error handling

### 3.2 Avatar Upload Failure
**Location:** `src/app/components/EditProfile/EditProfileModal.tsx:72-98`

**Issue:** Avatar file validation happens client-side, but upload could still fail server-side. No rollback if profile update succeeds but avatar upload fails.

**Risk:** Medium - Profile could be updated but avatar missing
**Mitigation:** Use transaction or rollback profile update if avatar upload fails

### 3.3 Profile Update Partial Failure
**Location:** `src/app/lib/services/userService.ts:114-129`

**Issue:** Profile update only updates provided fields, but if one field fails validation, entire update fails. No partial update support.

**Risk:** Low - Expected behavior, but should be documented
**Mitigation:** Document that all provided fields must be valid for update to succeed

### 3.4 Display Name Length Validation
**Location:** `src/app/components/EditProfile/EditProfileModal.tsx:127`

**Issue:** Display name is trimmed but no length validation. Could be extremely long.

**Current Code:**
```typescript
displayName: displayName.trim() || null,
```

**Risk:** Low - Database likely has length limit, but should validate client-side
**Mitigation:** Add max length validation (e.g., 100 characters)

## 4. Account Deletion Edge Cases

### 4.1 Storage Cleanup Failure
**Location:** `src/app/api/user/delete-account/route.ts:13-59`

**Issue:** If avatar or review image deletion fails, account deletion continues. Storage could accumulate orphaned files.

**Current Code:**
```typescript
} catch (storageError) {
  console.error('Error deleting avatar files:', storageError);
  // Continue with account deletion even if storage deletion fails
}
```

**Risk:** Medium - Storage bloat over time
**Mitigation:** Queue failed deletions for background cleanup, or retry before finalizing account deletion

### 4.2 Review Image Path Parsing
**Location:** `src/app/api/user/delete-account/route.ts:45-49`

**Issue:** Parses image URL by splitting on `/` and taking last segment. This could fail if URL format changes or contains unexpected characters.

**Current Code:**
```typescript
const pathsToDelete = images.map(img => {
  const urlParts = img.image_url.split('/');
  return urlParts[urlParts.length - 1];
});
```

**Risk:** Medium - Fragile parsing logic
**Mitigation:** Use proper URL parsing or store storage path separately in database

### 4.3 Business Ownership on Account Deletion
**Location:** `src/app/lib/migrations/002_business/001_businesses-schema.sql:21`

**Issue:** When user is deleted, `businesses.owner_id` is set to NULL (ON DELETE SET NULL), but `business_owners` entries are deleted (ON DELETE CASCADE). This creates inconsistency.

**Current Schema:**
```sql
owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
```

**Risk:** Medium - Businesses become ownerless but might still have `business_owners` entries if user deletion is partial
**Mitigation:** Ensure `business_owners` table also handles user deletion properly, or migrate to use only `business_owners` table

### 4.4 Cascade Delete Verification
**Location:** `src/app/lib/migrations/005_functions/002_delete-user-account.sql:9-24`

**Issue:** Documentation lists what should cascade, but no verification that all foreign keys are properly configured.

**Risk:** Medium - Orphaned records if cascade not properly configured
**Mitigation:** Add database migration to verify all foreign keys have proper CASCADE behavior

## 5. Email Verification Edge Cases

### 5.1 Verification Status Race Condition
**Location:** `src/app/components/Auth/EmailVerificationGuard.tsx:34-56`

**Issue:** Multiple `useEffect` hooks check verification status and update user state. Could cause race conditions or duplicate updates.

**Current Code:**
```typescript
useEffect(() => {
  if (isVerifiedFromUrl && user && !user.email_verified) {
    AuthService.getCurrentUser().then(freshUser => {
      if (freshUser?.email_verified) {
        updateUser({ email_verified: true });
      }
    });
  }
  // ... duplicate logic
}, [isVerifiedFromUrl, user, updateUser, verifiedParam, emailVerifiedParam]);
```

**Risk:** Low - Should work but could be optimized
**Mitigation:** Consolidate verification checks into single effect

### 5.2 Verification URL Parameter Reuse
**Location:** `src/app/verify-email/page.tsx:285-305`

**Issue:** URL parameters are cleaned after use, but if user refreshes before cleanup, verification could be retriggered.

**Risk:** Low - Handled by URL cleanup, but edge case exists
**Mitigation:** Use one-time tokens or session flags instead of URL parameters

### 5.3 Resend Verification Email Rate Limiting
**Location:** `src/app/components/Auth/EmailVerificationGuard.tsx:100-117`

**Issue:** No rate limiting on resend verification email. Users could spam verification emails.

**Risk:** Medium - Email spam, potential abuse
**Mitigation Needed:** Add rate limiting for resend verification email

### 5.4 Verification Email Delivery Failure
**Location:** `src/app/lib/auth.ts` (resendVerificationEmail)

**Issue:** No handling if email delivery fails. User might not know why they didn't receive email.

**Risk:** Low - Supabase handles delivery, but should provide better error messages
**Mitigation:** Check for common email delivery issues and provide helpful error messages

## 6. Password Reset Edge Cases

### 6.1 Password Reset Code Exchange
**Location:** `src/app/reset-password/page.tsx:46-68`

**Issue:** Password reset requires server-side code exchange, but if callback fails, user is stuck.

**Current Code:**
```typescript
if (code) {
  // Redirect to auth callback for code exchange
  const callbackUrl = new URL('/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('code', code);
  callbackUrl.searchParams.set('type', 'recovery');
  window.location.href = callbackUrl.toString();
  return;
}
```

**Risk:** Medium - User experience issue if redirect fails
**Mitigation:** Add error handling and fallback UI

### 6.2 Password Reset Rate Limiting
**Location:** `src/app/forgot-password/page.tsx:74-84`

**Issue:** Rate limiting exists but might not be strict enough. Users could still spam password reset requests.

**Risk:** Low - Rate limiting exists, but should verify thresholds
**Mitigation:** Review and adjust rate limit thresholds if needed

### 6.3 Password Update Validation
**Location:** `src/app/lib/auth.ts:566-608`

**Issue:** Password update might not validate password strength. Should ensure new password meets requirements.

**Risk:** Medium - Weak passwords could be set
**Mitigation:** Add password strength validation to update password function

## 7. User Stats Edge Cases

### 7.1 Stats Update Race Condition
**Location:** `supabase/migrations/20250106_create_user_stats.sql:24-76`

**Issue:** Multiple triggers update user stats concurrently. Database function uses `ON CONFLICT DO UPDATE` which helps, but high concurrency could still cause issues.

**Risk:** Low - Database handles concurrency, but stats might be slightly inaccurate during high load
**Mitigation:** Consider using advisory locks for critical stats updates

### 7.2 Missing User Stats
**Location:** `src/app/api/user/stats/route.ts:45-60`

**Issue:** If user_stats doesn't exist, returns default stats. This is correct, but stats might never be initialized if user has no activity.

**Current Code:**
```typescript
if (!stats) {
  const defaultStats: UserStats = {
    totalReviewsWritten: 0,
    // ... defaults
  };
  return NextResponse.json({ data: defaultStats, error: null });
}
```

**Risk:** Low - Expected behavior, but should initialize stats on first activity
**Mitigation:** Initialize stats record when user performs first activity

### 7.3 Stats Update Failure Silent
**Location:** `supabase/migrations/20250106_create_user_stats.sql:143-157`

**Issue:** Triggers update stats but don't handle errors. If stats update fails, error is logged but operation continues.

**Risk:** Low - Stats can be recalculated, but users see stale data
**Mitigation:** Add error logging and consider queuing failed updates

## 8. Username Uniqueness Edge Cases

### 8.1 Username Collision During Signup
**Location:** `supabase/migrations/update_profile_trigger_for_username.sql:38-44`

**Issue:** Username uniqueness check happens in trigger, but if two users sign up simultaneously with same email prefix, both could get same username before uniqueness check.

**Risk:** Low - Database unique constraint should prevent this
**Mitigation:** Ensure unique constraint exists and handle constraint violations gracefully

### 8.2 Username Update to Existing Username
**Location:** `src/app/lib/services/userService.ts:131-136`

**Issue:** When updating username, no explicit check if new username already exists. Relies on database constraint.

**Risk:** Low - Database constraint prevents this, but should provide better error message
**Mitigation:** Check username availability before update and provide clear error message

### 8.3 Username Case Sensitivity
**Location:** Multiple locations

**Issue:** Usernames are stored as-is (case-sensitive in database), but comparison might be case-insensitive in some places.

**Risk:** Low - Should be consistent
**Mitigation:** Document username case sensitivity policy and ensure consistent handling

## 9. OAuth/Social Login Edge Cases

### 9.1 OAuth Email Already Registered
**Location:** `src/app/lib/auth.ts:493-525`

**Issue:** If user tries to sign in with OAuth but email is already registered with password, could cause confusion.

**Risk:** Medium - User experience issue
**Mitigation:** Provide clear error message and option to link accounts or reset password

### 9.2 OAuth Profile Creation
**Location:** `supabase/migrations/update_profile_trigger_for_username.sql`

**Issue:** OAuth users might not have username in metadata. Trigger generates from email, but email might not be available immediately.

**Risk:** Low - Trigger handles this, but should verify
**Mitigation:** Ensure OAuth flow provides username or email for profile creation

## 10. Data Consistency Edge Cases

### 10.1 Profile Missing After User Creation
**Location:** `supabase/migrations/005_functions/001_database-functions.sql:33-40`

**Issue:** If profile creation trigger fails, user exists in auth.users but has no profile. This could cause errors in profile-dependent features.

**Risk:** Medium - Application errors if profile is missing
**Mitigation:** Add health check to detect and fix missing profiles, or use transaction for user creation

### 10.2 User Stats Not Initialized
**Location:** `src/app/api/user/stats/route.ts:45-60`

**Issue:** User stats might not be initialized until first activity. Queries expecting stats will return defaults.

**Risk:** Low - Expected behavior, but should initialize on signup
**Mitigation:** Initialize user_stats record when profile is created

### 10.3 Last Active Update Failure
**Location:** `src/app/api/user/stats/route.ts:36-41`

**Issue:** Last active update failure is logged but doesn't fail the request. Stats might be stale.

**Current Code:**
```typescript
try {
  await updateLastActive(supabase, userId);
} catch (lastActiveError: any) {
  console.warn('[Stats API] Failed to update last active:', lastActiveError?.message);
  // Continue even if this fails
}
```

**Risk:** Low - Non-critical, but should be monitored
**Mitigation:** Consider queuing failed updates for background processing

## 11. Security Edge Cases

### 11.1 Password Strength Validation Inconsistency
**Location:** `src/app/lib/auth.ts:390-394`, `src/app/components/Register/RegisterForm.tsx:248-255`

**Issue:** Password strength is checked client-side but server-side validation might differ. Weak passwords could be accepted if client validation is bypassed.

**Risk:** Medium - Security issue if client validation is bypassed
**Mitigation:** Ensure server-side validation matches or is stricter than client-side

### 11.2 Session Hijacking Prevention
**Location:** Various auth flows

**Issue:** No explicit session hijacking prevention measures. Relies on Supabase security.

**Risk:** Low - Supabase handles this, but should verify
**Mitigation:** Review Supabase session security settings

### 11.3 CSRF Protection
**Location:** API routes

**Issue:** No explicit CSRF protection on API routes. Relies on Supabase and Next.js defaults.

**Risk:** Low - Next.js and Supabase provide some protection, but should verify
**Mitigation:** Review and add explicit CSRF protection if needed

## 12. Performance Edge Cases

### 12.1 Profile Query N+1 Problem
**Location:** Various locations

**Issue:** Fetching user profiles with related data might cause N+1 queries if not optimized.

**Risk:** Low - Should be optimized, but should verify
**Mitigation:** Use joins or batch queries when fetching profiles with related data

### 12.2 User Stats Calculation Performance
**Location:** `supabase/migrations/20250106_create_user_stats.sql:24-76`

**Issue:** Stats calculation queries multiple tables. Could be slow for users with many reviews/votes.

**Risk:** Low - Stats are cached, but calculation could be slow
**Mitigation:** Add indexes and consider background job for heavy users

## Recommendations

### High Priority
1. **Enforce rate limiting** in ALL authentication endpoints
2. **Fix username validation inconsistency** between frontend and database
3. **Add rate limiting** for resend verification email
4. **Handle storage cleanup failures** in account deletion with retry/queue
5. **Add password strength validation** to password update function

### Medium Priority
1. **Add maximum iteration limit** to username generation loop
2. **Consolidate email verification checks** to prevent race conditions
3. **Add explicit error handling** for OAuth email conflicts
4. **Initialize user_stats** on profile creation
5. **Add health check** for missing profiles

### Low Priority
1. **Improve password reset error messages** for better UX
2. **Add advisory locks** for critical stats updates
3. **Document username case sensitivity** policy
4. **Review CSRF protection** measures
5. **Optimize profile queries** to prevent N+1 problems

