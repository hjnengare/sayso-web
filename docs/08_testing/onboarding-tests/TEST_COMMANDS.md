# Onboarding Test Commands

## Per-File Test Commands

Run individual test files with these commands:

### Context & State Management

```bash
# OnboardingContext tests
npm run test -- __tests__/onboarding/OnboardingContext.test.tsx

# Or with watch mode
npm run test -- __tests__/onboarding/OnboardingContext.test.tsx --watch
```

### Page Component Tests

```bash
# InterestsPage tests
npm run test -- __tests__/onboarding/InterestsPage.test.tsx

# SubcategoriesPage tests
npm run test -- __tests__/onboarding/SubcategoriesPage.test.tsx

# DealBreakersPage tests
npm run test -- __tests__/onboarding/DealBreakersPage.test.tsx
```

### Guard & Protection Tests

```bash
# OnboardingGuard tests
npm run test -- __tests__/onboarding/OnboardingGuard.test.tsx
```

### Regression & Error Handling

```bash
# Regression guardrails tests
npm run test -- __tests__/onboarding/regression-guardrails.test.tsx
```

### API Route Tests

```bash
# Onboarding API route tests
npm run test:api -- __tests__/api/onboarding-route.test.ts

# Or with standard test command
npm run test -- __tests__/api/onboarding-route.test.ts
```

## Batch Commands

### All Onboarding Tests

```bash
# All onboarding unit tests
npm run test -- __tests__/onboarding

# All onboarding tests (including API)
npm run test -- __tests__/onboarding __tests__/api/onboarding-route.test.ts
```

### By Category

```bash
# All page tests
npm run test -- __tests__/onboarding/*Page.test.tsx

# All guard/context tests
npm run test -- __tests__/onboarding/Onboarding*.test.tsx

# All regression tests
npm run test -- __tests__/onboarding/regression-*.test.tsx
```

## Test Options

### Watch Mode

```bash
npm run test -- __tests__/onboarding/InterestsPage.test.tsx --watch
```

### Coverage

```bash
npm run test -- __tests__/onboarding --coverage
```

### Verbose Output

```bash
npm run test -- __tests__/onboarding/InterestsPage.test.tsx --verbose
```

### Run Specific Test

```bash
# Run a specific test by name pattern
npm run test -- __tests__/onboarding/OnboardingContext.test.tsx -t "should save all onboarding data"
```

### Update Snapshots

```bash
npm run test -- __tests__/onboarding --updateSnapshot
```

## Quick Reference

| Test File | Command |
|-----------|---------|
| **OnboardingContext** | `npm run test -- __tests__/onboarding/OnboardingContext.test.tsx` |
| **InterestsPage** | `npm run test -- __tests__/onboarding/InterestsPage.test.tsx` |
| **SubcategoriesPage** | `npm run test -- __tests__/onboarding/SubcategoriesPage.test.tsx` |
| **DealBreakersPage** | `npm run test -- __tests__/onboarding/DealBreakersPage.test.tsx` |
| **OnboardingGuard** | `npm run test -- __tests__/onboarding/OnboardingGuard.test.tsx` |
| **Regression Guardrails** | `npm run test -- __tests__/onboarding/regression-guardrails.test.tsx` |
| **API Route** | `npm run test:api -- __tests__/api/onboarding-route.test.ts` |
| **All Onboarding** | `npm run test -- __tests__/onboarding` |

## Troubleshooting

### If tests fail to find files:

```bash
# Use absolute path pattern
npm run test -- "**/onboarding/**/*.test.tsx"

# Or specify full path
npm run test -- ./__tests__/onboarding/InterestsPage.test.tsx
```

### Run tests in specific order:

```bash
# Run tests sequentially (useful for debugging)
npm run test -- __tests__/onboarding --runInBand
```

### Debug mode:

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest __tests__/onboarding/InterestsPage.test.tsx
```

