# Better Testing Strategy for Onboarding

## Overview
The original test suite had several issues:
- Over-mocking made tests brittle
- Tests didn't verify actual user behavior
- Mocks were tightly coupled to implementation details
- Tests failed when code was refactored

## New Approach

### 1. Test Pyramid

```
      /\
     /  \  E2E Tests (Playwright)
    /----\
   /      \
  /        \ Integration Tests (Real components, mocked API)
 /----------\
/            \
Unit Tests   \ Unit Tests (Hooks, utilities)
(Helpers)     \
```

### 2. Test Categories

#### Unit Tests
- **What**: Individual functions, hooks, utilities
- **How**: Mocked dependencies, focused assertions
- **Location**: `__tests__/hooks/`, `__tests__/lib/`
- **Example**: `useInterestsPage` hook logic

#### Integration Tests  
- **What**: Multiple components working together
- **How**: Real components, mocked external APIs
- **Location**: `__tests__/onboarding/interests-page.test.tsx`
- **Example**: User selecting interests → continuing

#### E2E Tests
- **What**: Complete user flows
- **How**: Real app, real API (staging)
- **Location**: `e2e/`
- **Example**: Sign up → complete onboarding → see home

### 3. Key Principles

#### ✅ DO: Test Behavior
```typescript
// GOOD: Tests what user sees and does
it('should show continue button when selections made', async () => {
  render(<InterestsPage />);
  fireEvent.click(interestButton);
  expect(continueButton).not.toBeDisabled();
});
```

#### ❌ DON'T: Test Implementation
```typescript
// BAD: Tests internal details
it('should call setSelectedInterests with correct array', () => {
  expect(mockSetSelectedInterests).toHaveBeenCalledWith(['food']);
});
```

#### ✅ DO: Mock External APIs
```typescript
// GOOD: Mock API, use real context
jest.mock('fetch');
(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ interests: [...] }),
});
```

#### ❌ DON'T: Mock Context
```typescript
// BAD: Over-mocking loses real behavior
jest.mock('@/app/contexts/OnboardingContext');
(useOnboarding as jest.Mock).mockReturnValue({
  selectedInterests: [],
  setSelectedInterests: jest.fn(),
  // ... 20 more mocked properties
});
```

### 4. Test Structure

```typescript
describe('Feature Name', () => {
  describe('User Flow: Action Sequence', () => {
    it('should do X when user does Y', () => {
      // Setup
      render(<Component />);
      
      // Act
      fireEvent.click(button);
      
      // Assert
      expect(element).toHaveProperty(...);
    });
  });
});
```

### 5. New Test Utilities

Located in `__test-utils__/onboarding-test-helpers.ts`:

- `renderWithProviders()` - Render with all needed contexts
- `waitForLocalStorage()` - Handle debounced storage updates
- `createMockInterests()` - Realistic mock data
- `assertToastShown()` - Common assertions
- `assertSelectionsMatch()` - Verify UI state

### 6. Performance-Specific Tests

The debounced localStorage optimization requires tests that:

```typescript
// Account for debounce delay
await waitFor(
  () => {
    expect(localStorage.getItem('key')).not.toBeNull();
  },
  { timeout: 500 } // Allow for 300ms debounce + buffer
);

// Verify immediate UI update
fireEvent.click(button);
expect(uiElement).toHaveTextContent(selectedValue); // Instant

// Verify delayed storage update
expect(localStorage.getItem('key')).toBeNull(); // Not yet
await new Promise(r => setTimeout(r, 350));
expect(localStorage.getItem('key')).not.toBeNull(); // Now saved
```

### 7. Test File Organization

```
__tests__/
├── onboarding/
│   ├── interests-page.test.tsx        # Component + integration
│   ├── subcategories-page.test.tsx
│   ├── deal-breakers-page.test.tsx
│   └── onboarding-flow.test.tsx       # Full flow scenarios
├── hooks/
│   ├── useInterestsPage.test.tsx      # Hook unit tests
│   └── useSubcategoriesPage.test.tsx
├── contexts/
│   └── OnboardingContext.test.tsx     # Context logic
└── api/
    └── onboarding.test.ts             # API route tests

__test-utils__/
└── onboarding-test-helpers.ts         # Shared utilities
```

### 8. Running Tests

```bash
# All onboarding tests
npm test -- __tests__/onboarding

# Specific test file
npm test -- __tests__/onboarding/interests-page.test.tsx

# Watch mode
npm test -- __tests__/onboarding --watch

# Coverage
npm test -- __tests__/onboarding --coverage

# With debugging
npm test -- __tests__/onboarding --verbose
```

### 9. Common Assertions

```typescript
// Navigation
expect(mockRouter.push).toHaveBeenCalledWith('/subcategories');

// UI State
expect(element).toBeDisabled();
expect(element).toHaveAttribute('data-selected', 'true');

// Data Persistence
expect(localStorage.getItem('onboarding_interests')).not.toBeNull();

// API Calls
expect(global.fetch).toHaveBeenCalledWith('/api/interests', {
  cache: 'no-store',
});

// Toasts
expect(mockShowToast).toHaveBeenCalledWith(
  expect.stringMatching(/selected/i),
  'success'
);
```

### 10. Debugging Failed Tests

1. Check if debounce is involved → increase waitFor timeout
2. Check if localStorage is involved → use `waitForLocalStorage()`
3. Check if API is involved → verify fetch mock setup
4. Check console for warnings → they're often the issue
5. Use `screen.debug()` to see rendered HTML
6. Use `screen.logTestingPlaygroundURL()` for interactive debugging

## Migration Path

### Phase 1: Add New Tests
- New test files use best practices
- Old tests remain unchanged
- Gradually replace old tests

### Phase 2: Improve Old Tests
- Refactor overly-mocked tests
- Use new test utilities
- Increase coverage

### Phase 3: Deprecate
- Remove brittle old tests
- Keep focused, maintainable tests
- Aim for 80%+ coverage

## Expected Results

After implementing better tests:
- ✅ Tests are more readable and maintainable
- ✅ Tests fail for the right reasons (real bugs, not mocks)
- ✅ Tests recover quickly from refactors
- ✅ New developers understand test purpose easily
- ✅ CI/CD pipeline is more stable

## References

- [React Testing Library Docs](https://testing-library.com/react)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Best Practices](https://testingjavascript.com/)
