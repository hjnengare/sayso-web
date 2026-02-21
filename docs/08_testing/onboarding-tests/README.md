# Onboarding Test Suite

## Test Architecture

### Enforcement Strategy

The onboarding workflow enforces prerequisites at the **guard/middleware level**, not in page components:

```
/onboarding
  -> /interests           (must complete this)
    -> /subcategories     (only reachable if interests exist) ← Guard enforces
      -> /deal-breakers   (only reachable if subcategories exist) ← Guard enforces
        -> /complete
```

**Guards/Middleware** (enforce "should never happen"):
- `OnboardingGuard` redirects `/subcategories` → `/interests` if no interests
- `OnboardingGuard` redirects `/deal-breakers` → `/subcategories` if no subcategories
- Completed users redirected away from onboarding (except `/complete`)

**Page Components** (assume prerequisites met):
- Focus on selection validation, loading states, UI interactions
- May have defensive fallbacks, but guards are primary enforcement

## Test Files

### Guard Tests
- **`OnboardingGuard.test.tsx`** - Tests prerequisite enforcement

### Page Tests (assume prerequisites met)
- **`InterestsPage.test.tsx`** - Interests selection (3-6 required)
- **`SubcategoriesPage.test.tsx`** - Subcategories selection (1-10 required)
- **`DealBreakersPage.test.tsx`** - Deal-breakers selection (1-3 required)

### Context & Integration Tests
- **`OnboardingContext.test.tsx`** - State management
- **`onboarding-route.test.ts`** - API route handler
- **`regression-guardrails.test.tsx`** - Critical error scenarios

### E2E Tests
- **`e2e/onboarding-flow.spec.ts`** - Complete user journey

## Running Tests

```bash
# All onboarding tests
npm run test -- __tests__/onboarding

# Guard tests
npm run test -- __tests__/onboarding/OnboardingGuard.test.tsx

# Page tests
npm run test -- __tests__/onboarding/SubcategoriesPage.test.tsx
npm run test -- __tests__/onboarding/DealBreakersPage.test.tsx

# E2E flow
npm run test:e2e -- onboarding-flow
```

## Test Principles

1. **Guards test prerequisites** - Verify redirects when prerequisites not met
2. **Pages test functionality** - Assume prerequisites are met, test selection/UI
3. **E2E tests full flow** - Test complete user journey
4. **Regression tests critical paths** - API failures, fallbacks, error handling
