# Maintaining the Test Suite

## How to Keep Tests Up to Date

### When Adding New Features

1. **Write tests first** (TDD approach):
   ```typescript
   // 1. Write failing test
   it('should filter businesses by new feature', () => {
     // Test implementation
   });
   
   // 2. Implement feature
   // 3. Make test pass
   ```

2. **Update factories** if data structure changes:
   ```typescript
   // If business schema changes, update factory
   export function createBusiness(options: BusinessFactoryOptions = {}) {
     return {
       // ... existing fields
       newField: options.newField || 'default', // Add new field
     };
   }
   ```

3. **Add integration tests** for new user flows:
   ```typescript
   describe('New Feature Flow', () => {
     it('should complete new feature flow end-to-end', async () => {
       // Test complete flow
     });
   });
   ```

### When Refactoring

1. **Run tests before refactoring**:
   ```bash
   npm run test:all
   ```

2. **Keep tests passing** during refactoring:
   - Tests should verify behavior, not implementation
   - If tests break, fix them to match new implementation

3. **Update test descriptions** if behavior changes:
   ```typescript
   // Old
   it('should fetch businesses', () => {});
   
   // New (if behavior changed)
   it('should fetch businesses with pagination', () => {});
   ```

### When Fixing Bugs

1. **Write regression test first**:
   ```typescript
   it('should not crash when business has null category', () => {
     const business = createBusiness({ category: null });
     // Test that handles null category
   });
   ```

2. **Fix the bug**:
   ```typescript
   // Fix implementation
   const category = business.category || 'Unknown';
   ```

3. **Verify test passes**:
   ```bash
   npm run test
   ```

## Common Patterns

### Testing Async Operations

```typescript
it('should handle async data loading', async () => {
  const { result } = renderHook(() => useBusinesses());
  
  expect(result.current.loading).toBe(true);
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
  
  expect(result.current.businesses).toHaveLength(5);
});
```

### Testing Error States

```typescript
it('should handle API errors gracefully', async () => {
  mockFetchError(new Error('Network error'));
  
  const { result } = renderHook(() => useBusinesses());
  
  await waitFor(() => {
    expect(result.current.error).toBe('Network error');
  });
});
```

### Testing User Interactions

```typescript
it('should update when user clicks button', async () => {
  const { getByRole } = render(<Component />);
  
  const button = getByRole('button', { name: /submit/i });
  fireEvent.click(button);
  
  await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

## Scaling the Test Suite

### Organizing Tests

1. **Group related tests**:
   ```typescript
   describe('BusinessProfilePage', () => {
     describe('when user is owner', () => {
       it('should show edit button', () => {});
     });
     
     describe('when user is not owner', () => {
       it('should not show edit button', () => {});
     });
   });
   ```

2. **Use shared setup/teardown**:
   ```typescript
   describe('Component', () => {
     beforeEach(() => {
       // Setup common test data
     });
     
     afterEach(() => {
       // Cleanup
     });
   });
   ```

### Performance Optimization

1. **Mock expensive operations**:
   ```typescript
   // Mock API calls
   vi.mock('@/app/api/businesses', () => ({
     fetchBusinesses: vi.fn(() => Promise.resolve(mockData)),
   }));
   ```

2. **Use test data factories**:
   ```typescript
   // Instead of creating objects manually
   const business = createBusiness({ category: 'Restaurant' });
   ```

3. **Parallelize tests**:
   ```typescript
   // Jest runs tests in parallel by default
   // Playwright can run in parallel with workers
   ```

## Debugging Tests

### Running Single Test

```bash
# Jest
npm run test -- SimilarBusinesses.test.tsx

# Vitest
npm run test:vitest -- SimilarBusinesses

# Playwright
npm run test:e2e -- review-flow.spec.ts
```

### Debugging in VS Code

1. **Set breakpoints** in test files
2. **Run debug configuration**:
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Jest Debug",
     "program": "${workspaceFolder}/node_modules/.bin/jest",
     "args": ["--runInBand", "${file}"],
     "console": "integratedTerminal"
   }
   ```

### Viewing Test Output

```bash
# Verbose output
npm run test -- --verbose

# Coverage report
npm run test:coverage
open coverage/lcov-report/index.html

# Playwright report
npm run test:e2e
npx playwright show-report
```

## Test Maintenance Checklist

- [ ] All new features have tests
- [ ] Bug fixes include regression tests
- [ ] Test coverage meets minimum threshold (70%)
- [ ] All tests pass locally
- [ ] CI tests are passing
- [ ] Test descriptions are clear and descriptive
- [ ] Factories are up to date with data models
- [ ] Mocks reflect actual API behavior
- [ ] E2E tests cover critical user flows
- [ ] Flaky tests have been fixed

## When to Refactor Tests

1. **Tests are slow**: Optimize or mock expensive operations
2. **Tests are flaky**: Fix timing issues or race conditions
3. **Tests are hard to read**: Simplify or add comments
4. **Tests duplicate logic**: Extract shared test utilities
5. **Tests don't match behavior**: Update to reflect actual behavior

## Resources

- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

