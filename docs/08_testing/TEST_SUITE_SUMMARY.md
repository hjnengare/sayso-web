# Sayso Test Suite - Complete Summary

## Overview

This document provides a complete overview of the Sayso test suite, including all test files, utilities, and configurations.

## Test Coverage

### ✅ API Layer Tests
- **Location**: `__tests__/api/`
- **Files**:
  - `businesses.test.ts` - Business CRUD operations, filtering, personalization
  - `reviews.test.ts` - Review creation, editing, deletion, image management
- **Coverage**: Business fetching, editing, review operations, user profile onboarding, personalized recommendations

### ✅ Component Tests
- **Location**: `__tests__/components/`
- **Files**:
  - `SimilarBusinesses.test.tsx` - Similar businesses component with fallback logic
- **Additional Components to Test** (examples provided):
  - `BusinessProfilePage` - Main business profile display
  - `ReviewsList` - Review listing and interactions
  - `BusinessActionCard` - Owner/non-owner states
  - `Header`, `Footer`, `Search` - Navigation components

### ✅ Hook Tests
- **Location**: `__tests__/hooks/`
- **Files**:
  - `useBusinesses.test.ts` - Pagination, sorting, fallback logic
- **Additional Hooks to Test**:
  - `useUserHasReviewed` - Check if user has reviewed a business
  - `useAuth` - Authentication state management
  - `useUserPreferences` - User preference management

### ✅ Service Tests
- **Location**: `__tests__/services/`
- **Files**:
  - `personalizationService.test.ts` - Complete personalization algorithm testing
    - Interest matching
    - Subcategory matching
    - Deal breaker penalties
    - Distance scoring
    - Rating scoring
    - Freshness scoring

### ✅ Integration Tests
- **Location**: `__tests__/integration/`
- **Files**:
  - `review-flow.test.ts` - Complete review creation and editing flow
  - `similar-businesses-flow.test.ts` - Similar businesses with fallback strategy
- **Coverage**:
  - User sign in → Homepage personalized rows
  - Review editing → Form pre-fills
  - Business claiming → Permissions enforced
  - Similar businesses → Excludes current, dedupes, fallback

### ✅ E2E Tests
- **Location**: `e2e/`
- **Files**:
  - `review-flow.spec.ts` - Review creation, editing, image upload
  - `business-claiming.spec.ts` - Business claiming flow
  - `search-flow.spec.ts` - Search, filtering, navigation, bookmarking
- **Coverage**:
  - Reviewing a business end-to-end
  - Editing a review
  - Business owner replying to review
  - Saving/bookmarking a business
  - Searching + filtering + navigating
  - Personalized For-You feed

## Test Utilities

### Factories
- **Location**: `__test-utils__/factories/`
- **Files**:
  - `businessFactory.ts` - Create test businesses with various configurations
  - `userFactory.ts` - Create test users (regular, authenticated, business owner)
  - `reviewFactory.ts` - Create test reviews (with/without images, tags, etc.)

### Mocks
- **Location**: `__test-utils__/mocks/`
- **Files**:
  - `supabase.ts` - Mock Supabase client with full CRUD operations
  - `next-router.ts` - Mock Next.js router hooks

### Helpers
- **Location**: `__test-utils__/helpers/`
- **Files**:
  - `render.tsx` - Custom render with providers (Auth, Toast)
  - `test-helpers.ts` - Utility functions (mock fetch, create files, etc.)

## Configuration Files

### Test Runners
- `jest.config.js` - Jest configuration for unit/integration tests
- `vitest.config.ts` - Vitest configuration (alternative test runner)
- `playwright.config.ts` - Playwright configuration for E2E tests

### Setup Files
- `jest.setup.js` - Jest setup (mocks, global config)
- `vitest.setup.ts` - Vitest setup (mocks, global config)

### CI/CD
- `.github/workflows/test.yml` - GitHub Actions workflow for automated testing

## Running Tests

```bash
# All tests
npm run test:all

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Vitest (alternative runner)
npm run test:vitest
```

## Test Strategy

### Test Pyramid
- **60% Unit Tests** - Fast, isolated, high coverage
- **30% Integration Tests** - API routes, hooks, component interactions
- **10% E2E Tests** - Critical user flows

### Coverage Goals
- **Minimum**: 70% across all metrics
- **Critical Paths**: 100% (auth, payments, validation)

## Mocking Strategy

### Supabase
- Mock client with `createMockSupabaseClient()`
- Set mock data with `setMockData(table, data)`
- Mock auth with `setMockUser(user)`

### Next.js
- Router hooks mocked in setup files
- Image and Link components mocked
- API routes tested with mocked Supabase

### Fetch
- Mock global `fetch` with `mockFetchResponse()` or `mockFetchError()`

## Example Test Patterns

### Unit Test (Service)
```typescript
describe('PersonalizationService', () => {
  it('should calculate interest match score', () => {
    const business = createBusiness({ interest_id: 'food-drink' });
    const preferences = { interestIds: ['food-drink'], ... };
    const score = calculatePersonalizationScore(business, preferences);
    expect(score.breakdown.interestMatch).toBe(15);
  });
});
```

### Component Test
```typescript
describe('SimilarBusinesses', () => {
  it('should exclude current business', () => {
    render(<SimilarBusinesses currentBusinessId="business-1" ... />);
    expect(screen.queryByText('business-1')).not.toBeInTheDocument();
  });
});
```

### Integration Test
```typescript
describe('Review Flow', () => {
  it('should pre-fill form when editing', async () => {
    // Test complete flow from API to UI
  });
});
```

### E2E Test
```typescript
test('should create a new review', async ({ page }) => {
  await page.goto('/business/test-business-123');
  await page.click('text=Write a Review');
  // ... fill form and submit
  await expect(page.locator('text=Great experience!')).toBeVisible();
});
```

## Next Steps

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Tests**:
   ```bash
   npm run test:unit
   ```

3. **Add More Tests**:
   - Expand component test coverage
   - Add more integration test scenarios
   - Enhance E2E test coverage

4. **Set Up CI**:
   - Add GitHub secrets for test environment
   - Configure test database
   - Enable coverage reporting

5. **Maintain Tests**:
   - Keep factories up to date
   - Fix flaky tests immediately
   - Review coverage regularly

## Documentation

- **Test Strategy**: `docs/08_testing/TEST_STRATEGY.md`
- **Test README**: `docs/08_testing/README.md`
- **Maintaining Tests**: `docs/08_testing/MAINTAINING_TESTS.md`

## Support

For questions or issues with the test suite:
1. Check the documentation in `docs/08_testing/`
2. Review example tests in `__tests__/`
3. Check test utilities in `__test-utils__/`

