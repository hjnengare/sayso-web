# Onboarding Prerequisite Rule

## Rule Statement

**"no interests = no subcategories = no deal-breakers = no complete"**

This means:
- **No interests** → Cannot have subcategories
- **No subcategories** → Cannot have deal-breakers  
- **No deal-breakers** → Cannot complete onboarding

## Enforcement

### In Code (Guards/Middleware)

The prerequisite rule is enforced at the **guard/middleware level**:

- `OnboardingGuard` redirects `/subcategories` → `/interests` if no interests
- `OnboardingGuard` redirects `/deal-breakers` → `/subcategories` if no subcategories
- `OnboardingGuard` redirects `/complete` → `/deal-breakers` if prerequisites not met

### In Tests

All onboarding test files now enforce this rule:

1. **Test Documentation**: Each test file has a header comment explaining the prerequisite rule
2. **Prerequisite Tests**: Tests verify that operations fail when prerequisites are missing
3. **Test Assumptions**: Tests that assume prerequisites are met include comments explaining this

## Test File Updates

### OnboardingContext.test.tsx
- ✅ Added tests that verify `completeOnboarding` fails if:
  - No interests are selected
  - No subcategories are selected (even with interests)
  - No deal-breakers are selected (even with interests + subcategories)
- ✅ Updated existing tests to set prerequisites before testing dependent operations

### DealBreakersPage.test.tsx
- ✅ Added "Prerequisites Enforcement" test suite
- ✅ Tests verify that interests AND subcategories are required
- ✅ All existing tests now explicitly set both prerequisites

### SubcategoriesPage.test.tsx
- ✅ Added header documentation explaining prerequisite rule
- ✅ All tests explicitly set interests (prerequisite)
- ✅ Tests verify defensive behavior when prerequisites are missing

### InterestsPage.test.tsx
- ✅ Added header documentation (no prerequisites - this is the first step)

### OnboardingGuard.test.tsx
- ✅ Enhanced header documentation explaining the prerequisite chain
- ✅ Tests already verify prerequisite enforcement

### regression-guardrails.test.tsx
- ✅ Added header documentation explaining prerequisite rule

## Test Pattern

When writing new onboarding tests, follow this pattern:

```typescript
describe('Some Onboarding Feature', () => {
  // Prerequisite rule: no interests = no subcategories = no deal-breakers = no complete
  
  it('should work when prerequisites are met', () => {
    // Always set prerequisites first
    mockSearchParams.set('interests', 'food-drink');
    mockSearchParams.set('subcategories', 'sushi'); // if needed
    
    // Then test the feature
    // ...
  });
  
  it('should fail when prerequisites are missing', () => {
    // Intentionally omit prerequisites
    // Verify that operation fails or is blocked
    // ...
  });
});
```

## Key Principles

1. **Guards enforce prerequisites** - Tests verify guards redirect when prerequisites are missing
2. **Pages assume prerequisites** - Page tests assume prerequisites are met (enforced by guards)
3. **Context validates prerequisites** - Context tests verify operations fail without prerequisites
4. **Documentation is clear** - All test files document the prerequisite rule

## Running Tests

All tests should pass with the prerequisite rule enforced:

```bash
npm run test -- __tests__/onboarding
```

