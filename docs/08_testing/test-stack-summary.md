# Test Stack Summary

## Overview
This project uses a **multi-framework testing approach** with three main testing tools for different purposes:

1. **Jest** - Primary unit and integration testing
2. **Vitest** - Alternative fast unit testing (optional)
3. **Playwright** - End-to-end (E2E) testing

## Testing Frameworks

### 1. Jest (Primary Testing Framework)

**Purpose**: Unit tests, integration tests, and API route tests

**Configuration Files**:
- `jest.config.js` - Main Jest configuration
- `jest.api.config.js` - Separate config for API route tests (uses Node.js environment)
- `jest.setup.js` - Global test setup and mocks

**Key Features**:
- **Environment**: `jest-environment-jsdom` for component tests, `node` for API tests
- **Next.js Integration**: Uses `next/jest` for automatic Next.js configuration
- **Coverage Thresholds**: 70% for branches, functions, lines, and statements
- **Test Timeout**: 10 seconds
- **Module Aliases**: Supports `@/` and `@test-utils/` path aliases

**Test Scripts**:
```bash
npm run test              # Run all Jest tests
npm run test:watch        # Watch mode
npm run test:unit         # Unit tests only (excludes integration)
npm run test:integration  # Integration tests only
npm run test:api          # API route tests (uses Node.js env)
npm run test:coverage     # Generate coverage report
```

**Test Locations**:
- `__tests__/` - Main test directory
  - `__tests__/api/` - API route tests
  - `__tests__/components/` - Component tests
  - `__tests__/hooks/` - Custom hook tests
  - `__tests__/integration/` - Integration tests
  - `__tests__/services/` - Service layer tests

**Dependencies**:
- `jest` (^29.7.0)
- `jest-environment-jsdom` (^29.7.0)
- `@testing-library/jest-dom` (^6.1.5)
- `@testing-library/react` (^16.0.0)
- `@testing-library/user-event` (^14.5.1)
- `msw` (^2.0.0) - Mock Service Worker for API mocking

**Mocks & Setup**:
- Next.js router (`next/navigation`)
- Next.js Image component
- Next.js Link component
- Request/Response polyfills (using `undici` or `whatwg-fetch`)
- Console error suppression for known React warnings

### 2. Vitest (Alternative Fast Testing)

**Purpose**: Fast unit testing with Vite's native ESM support

**Configuration Files**:
- `vitest.config.ts` - Vitest configuration
- `vitest.setup.ts` - Vitest-specific setup

**Key Features**:
- **Environment**: `jsdom` for DOM testing
- **Globals**: Enabled (no need to import `describe`, `it`, etc.)
- **Coverage**: v8 provider with text, JSON, and HTML reporters
- **React Plugin**: Uses `@vitejs/plugin-react`

**Test Scripts**:
```bash
npm run test:vitest       # Run Vitest tests
npm run test:vitest:ui    # Run with UI interface
```

**Dependencies**:
- `vitest` (^1.1.0)
- `@vitest/ui` (^1.1.0)
- `@vitejs/plugin-react` (^4.2.1)

**Note**: Vitest appears to be set up as an alternative but may not be actively used. Jest is the primary framework.

### 3. Playwright (E2E Testing)

**Purpose**: End-to-end browser testing

**Configuration Files**:
- `playwright.config.ts` - Playwright configuration

**Key Features**:
- **Test Directory**: `./e2e/`
- **Browsers**: Chromium, Firefox, WebKit (Safari)
- **Mobile Testing**: Pixel 5 (Chrome), iPhone 12 (Safari)
- **Parallel Execution**: Enabled (fully parallel)
- **Retries**: 2 retries on CI, 0 locally
- **Web Server**: Automatically starts dev server before tests
- **Trace**: Collected on first retry
- **Screenshots**: Taken only on failure
- **Reporter**: HTML reporter

**Test Scripts**:
```bash
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui       # Run with UI mode
npm run test:e2e:debug    # Debug mode
```

**Test Locations**:
- `e2e/` - E2E test directory
  - `business-claiming.spec.ts`
  - `search-flow.spec.ts`
  - `review-flow.spec.ts`

**Dependencies**:
- `@playwright/test` (^1.40.0)

**Configuration Highlights**:
- Base URL: `http://localhost:3000` (or `PLAYWRIGHT_TEST_BASE_URL` env var)
- Timeout: 120 seconds for web server startup
- Reuses existing server if available (non-CI)

## Test Utilities

**Location**: `__test-utils__/`

### Factories
- `businessFactory.ts` - Create mock business objects
- `reviewFactory.ts` - Create mock review objects
- `userFactory.ts` - Create mock user objects

### Helpers
- `create-test-request.ts` - Helper for creating test Request objects
- `render.tsx` - Custom render function for React Testing Library
- `test-helpers.ts` - General test utilities

### Mocks
- `next-router.ts` - Next.js router mocks
- `supabase.ts` - Supabase client mocks

## Test Coverage

**Coverage Thresholds** (Jest):
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

**Coverage Exclusions**:
- Type definition files (`*.d.ts`)
- Story files (`*.stories.*`)
- Test directories (`__tests__/`, `__mocks__/`)

## Test Organization

```
project-root/
├── __tests__/              # Jest tests
│   ├── api/               # API route tests
│   ├── components/        # Component tests
│   ├── hooks/             # Hook tests
│   ├── integration/       # Integration tests
│   └── services/          # Service tests
├── e2e/                   # Playwright E2E tests
│   ├── business-claiming.spec.ts
│   ├── search-flow.spec.ts
│   └── review-flow.spec.ts
├── __test-utils__/        # Shared test utilities
│   ├── factories/         # Test data factories
│   ├── helpers/           # Test helpers
│   └── mocks/             # Mock implementations
├── jest.config.js         # Main Jest config
├── jest.api.config.js     # API test config
├── jest.setup.js          # Jest setup
├── vitest.config.ts       # Vitest config
├── vitest.setup.ts        # Vitest setup
└── playwright.config.ts   # Playwright config
```

## Running Tests

### All Tests
```bash
npm run test:all  # Runs unit + integration + E2E
```

### Individual Test Types
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# API tests
npm run test:api

# E2E tests
npm run test:e2e
```

### Development Workflow
```bash
# Watch mode (Jest)
npm run test:watch

# UI mode (Vitest)
npm run test:vitest:ui

# Debug E2E tests
npm run test:e2e:debug
```

## Key Testing Libraries

### React Testing
- **@testing-library/react** - React component testing
- **@testing-library/jest-dom** - DOM matchers
- **@testing-library/user-event** - User interaction simulation

### API Testing
- **MSW (Mock Service Worker)** - API mocking for integration tests
- **undici** - Request/Response polyfills

### E2E Testing
- **@playwright/test** - Browser automation

## Best Practices

1. **Unit Tests**: Use Jest with jsdom for component/hook testing
2. **API Tests**: Use Jest with Node.js environment (`jest.api.config.js`)
3. **Integration Tests**: Use Jest with MSW for API mocking
4. **E2E Tests**: Use Playwright for full user flow testing
5. **Test Data**: Use factories from `__test-utils__/factories/`
6. **Mocks**: Centralize mocks in `__test-utils__/mocks/`

## Notes

- **Jest is the primary framework** - Most tests use Jest
- **Vitest is optional** - Set up but may not be actively used
- **Playwright for E2E** - Full browser testing with multiple browser support
- **Separate API config** - API tests use Node.js environment to avoid Request polyfill conflicts
- **Next.js integration** - Both Jest and Vitest are configured for Next.js

