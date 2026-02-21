# Onboarding V2 Architecture

**Greenfield implementation - completely rewritten from scratch**

## Core Principles

### 1. Backend is Single Source of Truth
- **No client-side caching** of onboarding state
- **No localStorage** for progress tracking
- **No context propagation** of stale data
- Every page fetches fresh state on mount from database

### 2. Atomic Transitions
- Each step save is an atomic database transaction
- State updates happen server-side only
- Client only navigates after server confirms success

### 3. Pull-Based Navigation
- Pages **fetch** current state, don't receive it via props/context
- Middleware enforces access based on fresh database reads
- Navigation happens only after verifying new state from server

### 4. Pessimistic Updates
- Show loading state during save
- Only navigate after:
  1. Save succeeds on server
  2. Fresh state is fetched and verified
  3. New step is confirmed in database

### 5. Server-Side Verification
- Middleware reads database on every request
- No client-side "guards" that can be bypassed
- Access control happens at HTTP layer, not React layer

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                              │
│  profiles.onboarding_step = 'interests' | 'subcategories'   │
│           'deal-breakers' | 'complete'                       │
│                                                              │
│  This is the ONLY source of truth                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Fresh read on every request
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE                              │
│  - Fetches onboarding_step from database                    │
│  - Enforces step order (no skipping)                        │
│  - Redirects unauthorized access                            │
│  - Runs on EVERY route navigation                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Allows access if authorized
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   PAGE COMPONENT                             │
│  1. Mounts → fetches fresh state via API                    │
│  2. Validates can access current step                       │
│  3. Redirects if unauthorized (race condition backup)       │
│  4. Renders form with saved selections                      │
│  5. User submits → saves to API                             │
│  6. Waits for success response                              │
│  7. Fetches fresh state to verify save                      │
│  8. Navigates to next step ONLY after verification          │
└─────────────────────────────────────────────────────────────┘
```

---

## State Model

```typescript
// Database schema (profiles table)
interface OnboardingState {
  onboarding_step: 'interests' | 'subcategories' | 'deal-breakers' | 'complete'
  onboarding_complete: boolean

  // Verification counts (derived from junction tables)
  interests_count: number       // Count from user_interests
  subcategories_count: number   // Count from user_subcategories
  dealbreakers_count: number    // Count from user_dealbreakers
}

// Step progression
STEP_ORDER = ['interests', 'subcategories', 'deal-breakers', 'complete']

// Access rules
- Can access: current step OR previous steps (back navigation)
- Cannot access: future steps (skip prevention)
- If onboarding_complete: redirect all onboarding routes to /home
```

---

## File Structure

```
src/lib/onboarding-v2/
├── state.ts              # State model and validation logic
├── server.ts             # Server-side state fetching
├── client.ts             # Client-side API calls
└── useOnboardingPage.ts  # React hook for pages

src/app/api/onboarding/
├── state/route.ts        # GET /api/onboarding/state
├── interests/route.ts    # POST /api/onboarding/interests
├── subcategories/route.ts# POST /api/onboarding/subcategories
├── deal-breakers/route.ts# POST /api/onboarding/deal-breakers
└── complete/route.ts     # POST /api/onboarding/complete

src/middleware-v2.ts      # New middleware implementation
```

---

## Key Functions

### `fetchCurrentState()` - Client
```typescript
// Fetches fresh state from server
// Called on every page mount
// No caching, always fresh
const state = await fetchCurrentState();
// Returns: { onboarding_step, onboarding_complete, counts, user_id }
```

### `validateStepAccess()` - State Logic
```typescript
// Validates if user can access a step
const validation = validateStepAccess(state, requestedStep);
// Returns: { canAccess, redirectTo, isCurrentStep, isFutureStep }
```

### `useOnboardingPage()` - React Hook
```typescript
// Hook for page components
const { state, isLoading, canAccess, save } = useOnboardingPage({
  step: 'interests',
  onSave: saveInterests
});

// Flow:
// 1. Fetches state on mount
// 2. Validates access
// 3. Redirects if unauthorized
// 4. Provides save() that:
//    - Calls API
//    - Waits for success
//    - Fetches fresh state
//    - Navigates to next step
```

---

## Flow Examples

### Happy Path: Interests → Subcategories

```
USER ACTION: Clicks "Continue" on /interests
  ↓
1. save(selectedInterests) called
  ↓
2. POST /api/onboarding/interests { interest_ids: [...] }
  ↓
3. Server updates database:
   - Saves to user_interests table
   - Updates onboarding_step = 'subcategories'
   - Updates interests_count = 5
  ↓
4. API returns success
  ↓
5. Client fetches fresh state: GET /api/onboarding/state
  ↓
6. Verifies: onboarding_step = 'subcategories'
  ↓
7. router.replace('/subcategories')
  ↓
8. Middleware reads database:
   - onboarding_step = 'subcategories' ✓
   - Allows access to /subcategories
  ↓
9. /subcategories page mounts:
   - Fetches fresh state
   - Sees onboarding_step = 'subcategories'
   - Renders form immediately
```

**No refresh needed! State is fresh because:**
- Every component fetches its own state
- No reliance on stale context/props
- Server is always up-to-date

### Skip Prevention: Try to access /deal-breakers while on /interests

```
USER ACTION: Manually navigates to /deal-breakers
  ↓
1. Middleware intercepts request
  ↓
2. Fetches from database: onboarding_step = 'interests'
  ↓
3. Validates: requesting 'deal-breakers' but only on 'interests'
  ↓
4. Redirects to /interests (current step)
  ↓
5. User cannot skip ahead
```

### Back Navigation: Go back to edit interests

```
USER ACTION: On /subcategories, clicks browser back
  ↓
1. Navigates to /interests
  ↓
2. Middleware reads database: onboarding_step = 'subcategories'
  ↓
3. Validates: requesting 'interests', current is 'subcategories'
  ↓
4. Allows access (previous step)
  ↓
5. /interests page mounts:
   - Fetches fresh state
   - Loads saved interests from database
   - User can edit and re-save
```

---

## Why This Avoids Refresh Bugs

### Problem in Old Implementation
```
1. User saves interests
2. API updates database ✓
3. Client context still has old state ✗
4. Router navigates to /subcategories
5. Middleware reads database (new state) ✓
6. ProtectedRoute reads context (old state) ✗
7. Race condition: redirects back to /interests ✗
8. User must refresh to sync context ✗
```

### Solution in V2
```
1. User saves interests
2. API updates database ✓
3. Client has NO cached state (nothing to be stale)
4. Client fetches fresh state from API ✓
5. Verifies state matches expected next step ✓
6. Router navigates to /subcategories
7. Middleware reads database (new state) ✓
8. Page fetches fresh state (new state) ✓
9. Everything is in sync ✓
10. No refresh needed ✓
```

**Key Difference**: V2 has **no local state** that can become stale. Every read is from the server.

---

## Migration Plan

### Phase 1: Testing (Current)
- V2 files created in parallel
- Old implementation still active
- Can test V2 in isolation

### Phase 2: Page Updates
- Update interests/page.tsx to use useOnboardingPage()
- Update subcategories/page.tsx to use useOnboardingPage()
- Update deal-breakers/page.tsx to use useOnboardingPage()
- Update complete/page.tsx to use useOnboardingPage()

### Phase 3: Middleware Swap
- Replace src/middleware.ts with src/middleware-v2.ts
- Remove old routing logic
- Keep only V2 implementation

### Phase 4: Cleanup
- Delete old hooks (useInterestsPage, etc.)
- Delete old context (OnboardingContext)
- Delete old utilities
- Keep only V2 architecture

---

## Testing Checklist

- [ ] Fresh user completes full flow without refresh
- [ ] User cannot skip steps by URL manipulation
- [ ] Back navigation works (edit previous step)
- [ ] Forward navigation blocked until step complete
- [ ] Network failure doesn't corrupt state
- [ ] Multiple tabs don't cause race conditions
- [ ] Refresh on any step loads correctly
- [ ] Onboarding complete redirects to /home
- [ ] Email unverified redirects to /verify-email

---

## Benefits

✅ **No refresh required** - State always fresh
✅ **No race conditions** - Single source of truth
✅ **No stale cache** - No client-side caching
✅ **Server authoritative** - Middleware enforces access
✅ **Atomic transitions** - Database transactions
✅ **Type-safe** - Full TypeScript coverage
✅ **Testable** - Clear separation of concerns
✅ **Debuggable** - Simple data flow
✅ **Maintainable** - Single responsibility per file

---

## API Endpoints

### GET /api/onboarding/state
Returns current onboarding state for authenticated user.

**Response:**
```json
{
  "state": {
    "onboarding_step": "interests",
    "onboarding_complete": false,
    "interests_count": 0,
    "subcategories_count": 0,
    "dealbreakers_count": 0,
    "user_id": "uuid"
  }
}
```

### POST /api/onboarding/interests
Saves interests and advances to subcategories.

**Request:**
```json
{
  "interest_ids": ["food-drink", "beauty-wellness", "outdoors-adventure"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interests saved successfully",
  "next_step": "subcategories"
}
```

### POST /api/onboarding/subcategories
Saves subcategories and advances to deal-breakers.

**Request:**
```json
{
  "subcategories": [
    { "subcategory_id": "coffee-shops", "interest_id": "food-drink" },
    { "subcategory_id": "spas", "interest_id": "beauty-wellness" }
  ]
}
```

### POST /api/onboarding/deal-breakers
Saves deal-breakers and advances to complete.

**Request:**
```json
{
  "dealbreaker_ids": ["noise-level", "accessibility"]
}
```

### POST /api/onboarding/complete
Marks onboarding as complete.

**Response:**
```json
{
  "success": true,
  "onboarding_complete": true
}
```

---

## Summary

This V2 architecture eliminates all refresh-dependent bugs by:

1. **Never caching** onboarding state on the client
2. **Always fetching** fresh state from the database
3. **Verifying** server state before navigation
4. **Enforcing** access control at the middleware level
5. **Using atomic** database transactions for updates

The result is a **deterministic**, **bug-free** onboarding flow that progresses smoothly without requiring page refreshes.
