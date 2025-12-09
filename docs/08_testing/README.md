# Sayso Test Suite

Complete test suite for the Sayso local discovery platform.

## Quick Start

```bash
# Install dependencies (includes test libraries)
npm install

# Run all tests
npm run test:all

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
__tests__/
├── api/                    # API route tests
│   ├── businesses.test.ts
│   └── reviews.test.ts
├── components/             # Component tests
│   └── SimilarBusinesses.test.tsx
├── hooks/                  # Hook tests
│   └── useBusinesses.test.ts
├── services/               # Service/utility tests
│   └── personalizationService.test.ts
└── integration/            # Integration tests
    ├── review-flow.test.ts
    └── similar-businesses-flow.test.ts

e2e/                        # E2E tests (Playwright)
├── review-flow.spec.ts
├── business-claiming.spec.ts
└── search-flow.spec.ts

__test-utils__/             # Test utilities
├── factories/              # Data factories
│   ├── businessFactory.ts
│   ├── userFactory.ts
│   └── reviewFactory.ts
├── mocks/                  # Mock implementations
│   ├── supabase.ts
│   └── next-router.ts
└── helpers/                # Test helpers
    ├── render.tsx
    └── test-helpers.ts
```

## Writing Tests

### Unit Tests

**Location**: `__tests__/services/`, `__tests__/hooks/`

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { calculatePersonalizationScore } from '@/app/lib/services/personalizationService';

describe('PersonalizationService', () => {
  it('should calculate interest match score', () => {
    const business = createBusiness({ interest_id: 'food-drink' });
    const preferences = { interestIds: ['food-drink'], subcategoryIds: [], dealbreakerIds: [] };
    
    const score = calculatePersonalizationScore(business, preferences);
    
    expect(score.breakdown.interestMatch).toBe(15);
  });
});
```

### Component Tests

**Location**: `__tests__/components/`

**Example**:
```typescript
import { render, screen } from '@testing-library/react';
import SimilarBusinesses from '@/app/components/SimilarBusinesses/SimilarBusinesses';

describe('SimilarBusinesses', () => {
  it('should exclude current business from results', () => {
    render(
      <SimilarBusinesses
        currentBusinessId="business-1"
        category="Restaurant"
        location="Cape Town"
      />
    );
    
    expect(screen.queryByText('business-1')).not.toBeInTheDocument();
  });
});
```

### Integration Tests

**Location**: `__tests__/integration/`

**Example**:
```typescript
describe('Review Flow Integration', () => {
  it('should pre-fill form when editing a review', async () => {
    // Test complete flow from API to UI
  });
});
```

### E2E Tests

**Location**: `e2e/`

**Example**:
```typescript
import { test, expect } from '@playwright/test';

test('should create a new review', async ({ page }) => {
  await page.goto('/business/test-business-123');
  await page.click('text=Write a Review');
  // ... fill form and submit
  await expect(page.locator('text=Great experience!')).toBeVisible();
});
```

## Test Utilities

### Factories

Create test data easily:

```typescript
import { createBusiness, createBusinessArray } from '@/__test-utils__/factories/businessFactory';
import { createUser } from '@/__test-utils__/factories/userFactory';
import { createReview } from '@/__test-utils__/factories/reviewFactory';

const business = createBusiness({ category: 'Restaurant', average_rating: 4.5 });
const businesses = createBusinessArray(10);
const user = createUser({ interests: ['food-drink'] });
const review = createReview({ rating: 5, business_id: 'business-1' });
```

### Mocks

Mock Supabase and Next.js:

```typescript
import { createMockSupabaseClient } from '@/__test-utils__/mocks/supabase';
import { mockUseRouter } from '@/__test-utils__/mocks/next-router';

const mockSupabase = createMockSupabaseClient();
mockSupabase.setMockData('businesses', [business1, business2]);
```

### Helpers

```typescript
import { renderWithProviders } from '@/__test-utils__/helpers/render';
import { mockFetchResponse, createMockFile } from '@/__test-utils__/helpers/test-helpers';

// Render with providers
renderWithProviders(<Component />, { authValue: mockUser });

// Mock fetch
mockFetchResponse({ data: businesses });

// Create mock file
const file = createMockFile('test.jpg', 1024, 'image/jpeg');
```

## Coverage Goals

- **Minimum**: 70% coverage across all metrics
- **Critical paths**: 100% coverage (auth, payments, data validation)

View coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## CI/CD

Tests run automatically on:
- Every pull request
- Every push to `main` or `develop`

See `.github/workflows/test.yml` for configuration.

## Best Practices

1. **Keep tests fast**: Unit < 1s, Integration < 5s, E2E < 30s
2. **Isolate tests**: No shared state between tests
3. **Use descriptive names**: `it('should exclude current business from similar businesses')`
4. **Test behavior, not implementation**: Focus on user-facing behavior
5. **Maintain test data**: Keep factories up to date
6. **Fix flaky tests immediately**: Don't let them accumulate

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check import paths match your project structure

### E2E tests timing out
- Increase timeout in `playwright.config.ts`
- Check if dev server is running: `npm run dev`

### Mock not working
- Ensure mocks are set up in `jest.setup.js` or `vitest.setup.ts`
- Check mock is imported before the module being tested

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)

