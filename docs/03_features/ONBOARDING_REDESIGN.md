# Onboarding Redesign - Root Cause Analysis & Solution

## Root Cause Analysis

### Bug 1: Signup lands on /subcategories instead of /interests

**Location:** `src/app/auth/callback/route.ts` lines 140-160

**Root Cause:**
- The callback uses **count-based logic** (lines 141-154) instead of `onboarding_step`
- It checks `interests_count`, `subcategories_count`, `dealbreakers_count` to determine next step
- If a new user's profile is created with default counts > 0 (from triggers or migrations), they get redirected to wrong step
- The logic defaults to 'interests' only if ALL counts are 0, but if any count is > 0, it skips steps

**Fix:** Use `profile.onboarding_step` as single source of truth, default to 'interests' if null

---

### Bug 2: /deal-breakers redirects back to /subcategories (loop)

**Location:** `src/middleware.ts` lines 169-260

**Root Cause:**
- Middleware uses **BOTH** `onboarding_step` AND count-based logic (lines 186-210)
- Lines 199-210: It checks `onboarding_step` but then has a `stepMap` that maps CURRENT step to NEXT route
- Example: If `onboarding_step = 'deal-breakers'`, stepMap maps it to `/complete` (line 204)
- But then count-based logic (lines 186-196) can override this and send user back to `/subcategories`
- This creates a conflict: step says "deal-breakers" but counts say "subcategories"

**Fix:** Use ONLY `onboarding_step` for routing, ignore counts for routing decisions

---

### Bug 3: Inconsistent state between step and counts

**Root Cause:**
- API routes correctly update `onboarding_step` (interests → subcategories → deal-breakers → complete)
- But middleware and callback use counts as fallback/primary logic
- Counts can be out of sync with step (race conditions, partial saves, etc.)
- This creates two sources of truth that can conflict

**Fix:** Use `onboarding_step` as SINGLE source of truth, counts are for UI display only

---

## Solution: Strict State Machine

### State Machine Definition

```
States:
- 'interests' → user must complete interests step
- 'subcategories' → user must complete subcategories step  
- 'deal-breakers' → user must complete deal-breakers step
- 'complete' → user can access /complete page

Transitions (only in API routes after successful DB write):
- Save interests → set onboarding_step = 'subcategories'
- Save subcategories → set onboarding_step = 'deal-breakers'
- Save deal-breakers → set onboarding_step = 'complete'
- Finish /complete page → set onboarding_complete = true
```

### Access Rules

1. **If `onboarding_complete = true`:**
   - Block ALL onboarding routes → redirect to `/home`

2. **If `onboarding_complete = false`:**
   - Determine `requiredStep` from `onboarding_step` (default: 'interests')
   - If pathname is a **later step** than requiredStep → redirect to requiredStep (NO SKIP)
   - If pathname is **earlier step** → allow (back navigation works)
   - If pathname is **requiredStep** → allow
   - If pathname is **unrelated** (like /home) while incomplete → redirect to requiredStep

### Back Navigation

- Back arrows link to previous routes (earlier steps)
- Middleware allows earlier steps even if user is on later step
- Selections persist in DB, so back navigation shows previous choices

---

## Implementation Files

1. `src/lib/onboarding/getOnboardingAccess.ts` - Single source of truth helper
2. `src/middleware.ts` - Updated with strict state machine logic
3. `src/app/auth/callback/route.ts` - Fixed redirect logic
4. API routes - Already correct, but verified to ensure step transitions
5. Persistence examples - Show how to load/save selections

---

## Test Plan

1. ✅ New signup → lands on `/interests`
2. ✅ Try direct `/deal-breakers` → redirects to `/interests` (or current step)
3. ✅ Complete interests → step becomes `subcategories`
4. ✅ Back from subcategories → interests shows saved selections
5. ✅ Complete subcategories → step becomes `deal-breakers`
6. ✅ Back from deal-breakers → subcategories shows saved selections
7. ✅ Complete deal-breakers → step becomes `complete`
8. ✅ Complete screen → `onboarding_complete=true` → `/home`
9. ✅ Completed users can't access onboarding pages again

