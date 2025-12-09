# Test Suite Quick Reference

## Common Commands

```bash
# Run all tests
npm run test:all

# Run specific test type
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests

# Development
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report

# Debugging
npm run test -- --verbose  # Verbose output
npm run test:e2e:debug     # Debug E2E tests
```

## Quick Test Templates

### Unit Test (Service)
```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '@/app/lib/services/service';

describe('Service', () => {
  it('should do something', () => {
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });
});
```

### Component Test
```typescript
import { render, screen } from '@testing-library/react';
import Component from '@/app/components/Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Hook Test
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useHook } from '@/app/hooks/useHook';

describe('useHook', () => {
  it('should return expected value', async () => {
    const { result } = renderHook(() => useHook());
    await waitFor(() => {
      expect(result.current.value).toBe(expected);
    });
  });
});
```

### API Route Test
```typescript
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/route';

describe('/api/route', () => {
  it('should return data', async () => {
    const request = new NextRequest('http://localhost:3000/api/route');
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toBeDefined();
  });
});
```

### E2E Test
```typescript
import { test, expect } from '@playwright/test';

test('should complete flow', async ({ page }) => {
  await page.goto('/page');
  await page.click('button');
  await expect(page.locator('text=Success')).toBeVisible();
});
```

## Factory Usage

```typescript
import { createBusiness, createBusinessArray } from '@/__test-utils__/factories/businessFactory';
import { createUser } from '@/__test-utils__/factories/userFactory';
import { createReview } from '@/__test-utils__/factories/reviewFactory';

// Single entity
const business = createBusiness({ category: 'Restaurant' });
const user = createUser({ interests: ['food-drink'] });
const review = createReview({ rating: 5 });

// Multiple entities
const businesses = createBusinessArray(10);
```

## Mocking

### Supabase
```typescript
import { createMockSupabaseClient } from '@/__test-utils__/mocks/supabase';

const mockSupabase = createMockSupabaseClient();
mockSupabase.setMockData('businesses', [business1, business2]);
mockSupabase.setMockUser(user);
```

### Fetch
```typescript
import { mockFetchResponse, mockFetchError } from '@/__test-utils__/helpers/test-helpers';

mockFetchResponse({ data: businesses });
// or
mockFetchError(new Error('Network error'));
```

### Next.js Router
```typescript
import { mockUseRouter } from '@/__test-utils__/mocks/next-router';

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
}));
```

## Common Assertions

```typescript
// Element exists
expect(screen.getByText('Text')).toBeInTheDocument();

// Element does not exist
expect(screen.queryByText('Text')).not.toBeInTheDocument();

// Element is visible
expect(element).toBeVisible();

// Element has attribute
expect(element).toHaveAttribute('href', '/path');

// Element has class
expect(element).toHaveClass('className');

// Text content
expect(element).toHaveTextContent('Expected Text');

// Form input value
expect(input).toHaveValue('value');

// API response
expect(response.status).toBe(200);
expect(data).toHaveProperty('key');
```

## Async Testing

```typescript
// Wait for element
await waitFor(() => {
  expect(screen.getByText('Text')).toBeInTheDocument();
});

// Wait for async operation
await waitFor(() => {
  expect(result.current.loading).toBe(false);
});

// Wait for navigation
await expect(page).toHaveURL(/.*path/);
```

## File Structure

```
__tests__/
├── api/              # API route tests
├── components/       # Component tests
├── hooks/           # Hook tests
├── services/        # Service tests
└── integration/     # Integration tests

e2e/                 # E2E tests

__test-utils__/
├── factories/       # Data factories
├── mocks/          # Mock implementations
└── helpers/        # Test helpers
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` |
| Tests timing out | Increase timeout or check async operations |
| Mock not working | Ensure mock is imported before module |
| E2E tests fail | Check dev server is running |

## Resources

- **Full Documentation**: `docs/08_testing/README.md`
- **Test Strategy**: `docs/08_testing/TEST_STRATEGY.md`
- **Maintenance Guide**: `docs/08_testing/MAINTAINING_TESTS.md`

