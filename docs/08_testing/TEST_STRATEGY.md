# Sayso Test Strategy

## Overview

This document outlines the comprehensive test strategy for Sayso, a full-stack local discovery platform built with Next.js, TypeScript, and Supabase.

## Test Pyramid

```
        /\
       /E2E\          ← End-to-End Tests (Playwright)
      /------\
     /Integration\    ← Integration Tests (Jest/Vitest)
    /------------\
   /   Unit Tests  \  ← Unit Tests (Jest/Vitest + RTL)
  /----------------\
```

### Distribution Target
- **Unit Tests**: 60% (Fast, isolated, high coverage)
- **Integration Tests**: 30% (API routes, hooks, component interactions)
- **E2E Tests**: 10% (Critical user flows)

## Test Categories

### 1. Unit Tests

#### API Layer
- **Location**: `__tests__/api/`
- **Coverage**:
  - Business CRUD operations
  - Review creation, editing, deletion
  - User profile onboarding
  - Personalized recommendation endpoint
  - Authentication flows
  - Search and filtering logic

#### Services
- **Location**: `__tests__/services/`
- **Coverage**:
  - Personalization scoring algorithm
  - Each signal: interests, subcategories, deal breakers, distance, rating, freshness
  - Business filtering and sorting
  - Distance calculations

#### Hooks
- **Location**: `__tests__/hooks/`
- **Coverage**:
  - `useBusinesses` (pagination, sorting, fallback)
  - `useUserHasReviewed`
  - `useAuth`
  - `useUserPreferences`
  - `useReviewForm`

#### Components
- **Location**: `__tests__/components/`
- **Coverage**:
  - BusinessProfilePage
  - SimilarBusinesses (including fallback logic)
  - ReviewsList + editing/reply flows
  - BusinessActionCard (owner / non-owner states)
  - Header, Footer, Search
  - Form components

### 2. Integration Tests

#### Location: `__tests__/integration/`

**Core Flows**:
1. **User Authentication Flow**
   - Sign in → Homepage personalized rows load correctly
   - Protected routes redirect correctly
   - Business owner access control

2. **Review Flow**
   - User edits a review → form pre-fills existing content
   - Image upload and removal
   - Review submission and updates

3. **Business Management Flow**
   - Claiming/adding a business → correct permissions enforced
   - Business owner editing
   - Business hours management

4. **Similar Businesses Flow**
   - Always excludes the current business
   - Deduplicates results
   - Uses fallback strategy (category+location → category → location)

5. **Personalization Flow**
   - Preferences affect business ranking
   - Deal breakers filter correctly
   - Distance-based scoring

### 3. E2E Tests

#### Location: `e2e/`

**Critical User Journeys** (Playwright):
1. Reviewing a business end-to-end
2. Editing a review
3. Business owner replying to a review
4. Saving/bookmarking a business
5. Searching + filtering + navigating to a business page
6. Personalized For-You feed ranking
7. Onboarding flow
8. Business claiming flow

## Testing Tools

### Unit & Integration
- **Jest**: Primary test runner
- **Vitest**: Alternative for faster unit tests
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking

### E2E
- **Playwright**: Browser automation
- **Test Containers**: Database isolation (optional)

## Mocking Strategy

### Supabase Client
- Mock Supabase client methods
- Factory functions for test data
- Isolated database operations

### Next.js API Routes
- Mock `getServerSupabase` for server-side tests
- Mock `fetch` for client-side tests
- Use MSW for API route testing

### Authentication
- Mock `useAuth` context
- Mock Supabase auth methods
- Test both authenticated and unauthenticated states

## Test Data Management

### Factories
- `businessFactory`: Generate test businesses
- `userFactory`: Generate test users
- `reviewFactory`: Generate test reviews
- `eventFactory`: Generate test events

### Fixtures
- Pre-defined test data sets
- Edge cases and error scenarios
- Performance test data

## Coverage Goals

### Minimum Coverage Thresholds
- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### Critical Paths (100% Coverage)
- Authentication flows
- Payment processing (if applicable)
- Data validation
- Security-sensitive operations

## CI/CD Integration

### GitHub Actions
- Run tests on every PR
- Run E2E tests on main branch
- Generate coverage reports
- Block merges if coverage drops

### Pre-commit Hooks
- Run unit tests
- Run linter
- Type checking

## Test Maintenance

### Best Practices
1. **Keep tests fast**: Unit tests < 1s, Integration < 5s, E2E < 30s
2. **Isolate tests**: No shared state between tests
3. **Use descriptive names**: `it('should exclude current business from similar businesses')`
4. **Test behavior, not implementation**: Focus on user-facing behavior
5. **Maintain test data**: Keep factories up to date
6. **Review test failures**: Fix flaky tests immediately

### When to Write Tests
- ✅ New features
- ✅ Bug fixes (regression tests)
- ✅ Refactoring (ensure behavior unchanged)
- ✅ Critical paths
- ❌ Don't test third-party libraries
- ❌ Don't test implementation details

## Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.spec.ts` (in `e2e/` directory)

## Directory Structure

```
__tests__/
├── api/
│   ├── businesses.test.ts
│   ├── reviews.test.ts
│   └── user.test.ts
├── components/
│   ├── BusinessProfilePage.test.tsx
│   ├── SimilarBusinesses.test.tsx
│   └── ReviewsList.test.tsx
├── hooks/
│   ├── useBusinesses.test.ts
│   └── useAuth.test.ts
├── services/
│   └── personalizationService.test.ts
├── integration/
│   ├── review-flow.test.ts
│   └── business-claiming.test.ts
└── __mocks__/
    ├── supabase.ts
    └── next-router.ts

e2e/
├── review-flow.spec.ts
├── business-claiming.spec.ts
└── search-flow.spec.ts

__test-utils__/
├── factories/
│   ├── businessFactory.ts
│   ├── userFactory.ts
│   └── reviewFactory.ts
├── mocks/
│   ├── supabase.ts
│   └── auth.ts
└── helpers/
    ├── render.tsx
    └── test-helpers.ts
```

