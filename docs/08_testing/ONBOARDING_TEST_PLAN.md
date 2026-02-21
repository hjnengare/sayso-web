# Onboarding Test Plan

## Test Scenarios

### 1. New User Signup Flow
**Goal:** Verify new users always land on `/interests`

**Steps:**
1. Create new account (email/password or OAuth)
2. Verify email (if required)
3. **Expected:** User lands on `/interests` (NOT `/subcategories` or any other step)
4. **Check:** `profiles.onboarding_step = 'interests'` (or null, which defaults to 'interests')

**Logs to check:**
- `[Auth Callback] Redirecting to required onboarding step: { onboarding_step: 'interests', requiredRoute: '/interests' }`
- `[Middleware] Onboarding access determined: { requiredStep: 'interests', requiredRoute: '/interests' }`

---

### 2. Skip Ahead Prevention
**Goal:** Verify users cannot skip to later steps

**Steps:**
1. Complete signup, land on `/interests`
2. Try to directly access `/deal-breakers` (type URL in browser)
3. **Expected:** Redirected to `/interests` (current required step)
4. Complete interests step
5. Try to directly access `/deal-breakers` again
6. **Expected:** Redirected to `/subcategories` (current required step)

**Logs to check:**
- `[Middleware] Blocking skip ahead - redirecting to required step: { currentPath: '/deal-breakers', requiredRoute: '/interests' }`

---

### 3. Step Completion and Transition
**Goal:** Verify step transitions happen correctly after successful save

**Steps:**
1. On `/interests`, select at least 1 interest
2. Click "Continue" to save
3. **Expected:** 
   - API saves to `user_interests`
   - `profiles.onboarding_step` updates to `'subcategories'`
   - User navigates to `/subcategories`
4. On `/subcategories`, select at least 1 subcategory
5. Click "Continue" to save
6. **Expected:**
   - API saves to `user_subcategories`
   - `profiles.onboarding_step` updates to `'deal-breakers'`
   - User navigates to `/deal-breakers`
7. On `/deal-breakers`, select at least 1 deal-breaker
8. Click "Continue" to save
9. **Expected:**
   - API saves to `user_dealbreakers`
   - `profiles.onboarding_step` updates to `'complete'`
   - `profiles.onboarding_complete` stays `false`
   - User navigates to `/complete`

**Logs to check:**
- `[Interests API] Save completed: { onboarding_step: 'subcategories' }`
- `[Subcategories API] Advancing onboarding step: { nextStep: 'deal-breakers' }`
- `[Onboarding API] Deal-breakers saved, advanced to complete step: { onboarding_step: 'complete' }`

---

### 4. Back Navigation with Persistence
**Goal:** Verify back navigation shows saved selections

**Steps:**
1. Complete interests step (select interests, save)
2. Navigate to `/subcategories`
3. Click back arrow to go to `/interests`
4. **Expected:** 
   - User can access `/interests` (earlier step allowed)
   - Previously selected interests are pre-checked/visible
5. On `/subcategories`, select subcategories and save
6. Navigate to `/deal-breakers`
7. Click back arrow to go to `/subcategories`
8. **Expected:**
   - User can access `/subcategories` (earlier step allowed)
   - Previously selected subcategories are pre-checked/visible

**Logs to check:**
- `[Middleware] Allowing access to onboarding route: { currentPath: '/interests', requiredStep: 'subcategories' }`
- Page loads selections from `/api/user/onboarding`

---

### 5. Complete Page and Final Transition
**Goal:** Verify complete page marks onboarding as complete

**Steps:**
1. Complete all steps (interests → subcategories → deal-breakers)
2. Land on `/complete` page
3. Click "Finish" or equivalent button
4. **Expected:**
   - API call to `/api/user/onboarding` with `{ step: 'complete', markComplete: true }`
   - `profiles.onboarding_complete` updates to `true`
   - User redirects to `/home`

**Logs to check:**
- `[Onboarding API] Marking onboarding as complete (server-side check)`
- `[Onboarding API] Onboarding marked as complete successfully`

---

### 6. Completed Users Cannot Access Onboarding
**Goal:** Verify completed users are blocked from onboarding routes

**Steps:**
1. Complete full onboarding flow (all steps + complete page)
2. Try to access `/interests` directly
3. **Expected:** Redirected to `/home`
4. Try to access `/subcategories` directly
5. **Expected:** Redirected to `/home`
6. Try to access `/deal-breakers` directly
7. **Expected:** Redirected to `/home`
8. Try to access `/complete` directly
9. **Expected:** Allowed (for celebration), but can also redirect to `/home` if desired

**Logs to check:**
- `[Middleware] User completed onboarding, redirecting to home`

---

### 7. Edge Cases

#### 7a. Profile Missing onboarding_step
**Steps:**
1. Create user with profile but `onboarding_step = null`
2. Try to access any onboarding route
3. **Expected:** Defaults to `'interests'`, user lands on `/interests`

#### 7b. Partial Save Failure
**Steps:**
1. On `/interests`, select interests
2. Click "Continue" but API fails (simulate network error)
3. **Expected:** 
   - Error message shown to user
   - `onboarding_step` does NOT change
   - User stays on `/interests`
   - Can retry save

#### 7c. Direct Access to /home While Incomplete
**Steps:**
1. Complete signup, land on `/interests`
2. Try to access `/home` directly
3. **Expected:** Redirected to `/interests` (required step)

---

## Automated Test Checklist

- [ ] Unit test: `getOnboardingAccess` helper function
- [ ] Unit test: Step comparison logic
- [ ] Integration test: Full onboarding flow
- [ ] Integration test: Back navigation
- [ ] Integration test: Skip ahead prevention
- [ ] E2E test: New signup → interests
- [ ] E2E test: Complete flow → home
- [ ] E2E test: Completed user blocked from onboarding

---

## Manual Testing Checklist

1. ✅ New signup → `/interests`
2. ✅ Try direct `/deal-breakers` → redirects to current step
3. ✅ Complete interests → step becomes `subcategories`
4. ✅ Back from subcategories → interests shows saved selections
5. ✅ Complete subcategories → step becomes `deal-breakers`
6. ✅ Back from deal-breakers → subcategories shows saved selections
7. ✅ Complete deal-breakers → step becomes `complete`
8. ✅ Complete screen → `onboarding_complete=true` → `/home`
9. ✅ Completed users can't access onboarding pages again

---

## Debugging Tips

### Check Profile State
```sql
SELECT 
  user_id,
  onboarding_step,
  onboarding_complete,
  interests_count,
  subcategories_count,
  dealbreakers_count
FROM profiles
WHERE user_id = '<user-id>';
```

### Check Join Tables
```sql
-- Interests
SELECT * FROM user_interests WHERE user_id = '<user-id>';

-- Subcategories
SELECT * FROM user_subcategories WHERE user_id = '<user-id>';

-- Deal-breakers
SELECT * FROM user_dealbreakers WHERE user_id = '<user-id>';
```

### Common Issues

1. **User lands on wrong step:**
   - Check `profiles.onboarding_step` value
   - Check auth callback redirect logic
   - Check middleware access logic

2. **Redirect loop:**
   - Verify API route updated `onboarding_step` correctly
   - Check middleware is using `onboarding_step` (not counts)
   - Ensure step transition happened after successful save

3. **Back navigation doesn't show selections:**
   - Verify `/api/user/onboarding` GET endpoint returns data
   - Check page loads selections on mount
   - Verify join tables have data

