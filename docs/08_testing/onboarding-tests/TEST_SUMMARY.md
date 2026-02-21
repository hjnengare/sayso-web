# Onboarding Tests Summary

## Test Architecture

### Enforcement Strategy

**Guards/Middleware** enforce prerequisites (the "should never happen" cases):
- `OnboardingGuard` redirects `/subcategories` → `/interests` if no interests
- `OnboardingGuard` redirects `/deal-breakers` → `/subcategories` if no subcategories
- Completed users are redirected away from onboarding routes (except `/complete`)

**Page Components** assume prerequisites are met and focus on:
- Selection validation (1-10 subcategories, 1-3 deal-breakers)
- Loading states
- UI interactions
- Data fetching and display

## Test Files Created

### 1. **OnboardingGuard.test.tsx** ✅
Tests for guard enforcement of prerequisites:
- ✅ Redirects `/subcategories` → `/interests` if no interests
- ✅ Redirects `/deal-breakers` → `/subcategories` if no subcategories
- ✅ Redirects completed users away from onboarding (except `/complete`)
- ✅ Email verification requirement for `/interests`
- ✅ Unauthenticated user redirects
- ✅ Loading state handling

**Key Test Scenarios:**
- Prerequisites are enforced at guard level
- Completed users can't access onboarding steps
- Unverified users can't access `/interests`

### 2. **SubcategoriesPage.test.tsx** ✅
Comprehensive tests for the `/subcategories` page covering:
- ✅ Rendering and component structure
- ✅ Loading states when fetching sub-interests
- ✅ URL parameter handling (missing `?interests=` param redirects to `/deal-breakers`)
- ✅ Selection validation (1-10 subcategories)
- ✅ Maximum limit enforcement (10 max)
- ✅ Continue button state (enabled/disabled)
- ✅ Navigation to deal-breakers with URL params
- ✅ Error handling (API failures, context errors)
- ✅ Grouped display by interest category

**Key Test Scenarios:**
- Loading state shows while fetching
- Assumes interests already exist (enforced by guard)
- Prevents selecting more than 10 subcategories
- Passes both interests and subcategories in URL to next step
- Defensive fallback redirect if no interests param (guard should catch first)

### 3. **e2e/onboarding-flow.spec.ts** ✅
Playwright E2E tests for the complete onboarding workflow:
- ✅ Full path: `/onboarding` → `/register` → `/interests` → `/subcategories` → `/deal-breakers` → `/complete` → `/home`
- ✅ Validates selection limits at each step
- ✅ **Asserts final payload to `/api/user/onboarding`** with correct structure
- ✅ Tests validation rules (3-6 interests, 1-10 subcategories, 1-3 deal-breakers)

**Key Test Scenarios:**
- Complete end-to-end flow
- Validates API payload structure
- Tests selection limits at each step

### 4. **regression-guardrails.test.tsx** ✅
Critical regression tests for error handling:
- ✅ **"If /api/user/onboarding fails, user still lands on /complete"** (both 500 error and network error)
- ✅ **"If interests API fails, fallback interests are used"** (network error, invalid data, non-array)
- ✅ Error state management (error set but fallback provided)

**Key Test Scenarios:**
- API failure (500) → still navigates to `/complete`
- Network error → still navigates to `/complete` + shows toast
- Interests API failure → uses fallback interests
- Invalid API response → uses fallback interests

## Test Coverage Summary

### Unit Tests (Jest)
- ✅ **OnboardingGuard.test.tsx** - Guard enforcement of prerequisites
- ✅ **OnboardingContext.test.tsx** - Context state management
- ✅ **InterestsPage.test.tsx** - Interests selection page
- ✅ **SubcategoriesPage.test.tsx** - Subcategories selection page (assumes prerequisites met)
- ✅ **DealBreakersPage.test.tsx** - Deal-breakers selection page (assumes prerequisites met)
- ✅ **regression-guardrails.test.tsx** - Critical error scenarios

### Integration Tests (Jest)
- ✅ **onboarding-route.test.ts** - API route handler (`/api/user/onboarding`)

### E2E Tests (Playwright)
- ✅ **onboarding-flow.spec.ts** - Complete user journey

## Running the Tests

```bash
# Run all onboarding unit tests
npm run test -- __tests__/onboarding

# Run subcategories tests only
npm run test -- __tests__/onboarding/SubcategoriesPage.test.tsx

# Run regression guardrails
npm run test -- __tests__/onboarding/regression-guardrails.test.tsx

# Run E2E onboarding flow
npm run test:e2e -- onboarding-flow

# Run API route tests
npm run test:api -- onboarding-route
```

## Test Coverage by Feature

### ✅ Prerequisites Enforcement (Guards)
- `/subcategories` blocked without interests (OnboardingGuard)
- `/deal-breakers` blocked without subcategories (OnboardingGuard)
- Completed users redirected away (OnboardingGuard)
- Email verification required for `/interests` (OnboardingGuard)

### ✅ Selection Validation
- Interests: 3-6 required (tested in InterestsPage)
- Subcategories: 1-10 required (tested in SubcategoriesPage)
- Deal-breakers: 1-3 required (tested in DealBreakersPage)

### ✅ Navigation Flow
- Step progression tested in E2E
- URL parameter passing tested in unit tests
- Back navigation tested
- Prerequisites enforced by guards (not pages)

### ✅ Error Handling
- API failures → graceful degradation (regression tests)
- Network errors → fallback data (regression tests)
- Missing params → redirects (SubcategoriesPage tests)

### ✅ Data Persistence
- localStorage during flow (OnboardingContext tests)
- API save on completion (DealBreakersPage + API route tests)
- Atomic transaction with fallback (API route tests)

### ✅ UX Behavior
- Loading states (SubcategoriesPage tests)
- Button enable/disable (all page tests)
- Toast notifications (all page tests)
- Error messages (all page tests)

## Regression Guardrails

These tests ensure critical error handling doesn't regress:

1. **API Failure Graceful Degradation**
   - `/api/user/onboarding` fails → user still reaches `/complete`
   - Network error → user still reaches `/complete` + error toast

2. **Fallback Data**
   - `/api/interests` fails → fallback interests used
   - Invalid API response → fallback interests used

3. **Error State Management**
   - Errors are set in context but don't block user flow
   - Fallback data ensures functionality continues

## Notes

- All tests use TypeScript
- Tests follow existing patterns from `businesses.test.ts`
- Mocks are properly set up and isolated
- E2E tests may need adjustment for actual authentication flow
- Some E2E tests may need to handle email verification in test environment

