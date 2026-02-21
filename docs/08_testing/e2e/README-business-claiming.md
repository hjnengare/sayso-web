# Business Claiming E2E Tests Setup Guide

## ⚠️ Important Setup Requirements

These tests use Playwright's `storageState` to authenticate users, which makes them faster and more reliable. **You must create an authenticated session before running tests.**

## Quick Start

### 1. Create Authenticated Session (Required)

Run this command to open a browser window where you'll log in manually:

```bash
# Start your dev server first
npm run dev

# In another terminal, run codegen
npx playwright codegen --save-storage=playwright/.auth/user.json http://localhost:3000/login
```

**Steps:**
1. A browser window will open to the login page
2. Log in with valid credentials (use a test account)
3. Once logged in, close the browser window
4. The authentication state will be saved to `playwright/.auth/user.json`

**Note**: This file is gitignored and should not be committed. Each developer needs to create their own auth state.

### 2. Run Tests

```bash
npm run test:e2e -- business-claiming
```

That's it! The tests will use the saved authentication state and skip the login step.

## How It Works

The tests use Playwright's `storageState` feature to:
- **Skip login** in every test (faster, more reliable)
- **Reuse authentication** across all tests
- **Avoid credential management** in test code

This means:
- ✅ Tests run faster (no login step)
- ✅ Tests are more reliable (no credential issues)
- ✅ Tests focus on business logic, not auth setup
- ✅ One-time setup per developer

## Alternative: Testing Login Flow

If you need to test the login flow itself, you can:

1. **Create a separate test file** that doesn't use `storageState`
2. **Use environment variables** for credentials:
   ```bash
   export E2E_TEST_USER_EMAIL=test@example.com
   export E2E_TEST_USER_PASSWORD=password123
   ```
3. **Add error assertions** to fail fast:
   ```ts
   await expect(page.getByText(/invalid email or password/i)).toHaveCount(0, { timeout: 5000 });
   ```

## Prerequisites

1. **Test Database**: Ensure you have a test database set up (or use environment variables to point to a test instance)
2. **Test User**: Create a test user account that can be used for authentication
3. **Authenticated Session**: Run `npx playwright codegen` to create the auth state file (see Quick Start above)

## What Each Test Verifies

1. **should allow authenticated user to claim a business**
   - ✅ Business search works
   - ✅ Modal opens correctly
   - ✅ Form validation works
   - ✅ API call succeeds (200 response)
   - ✅ Success feedback appears

2. **should redirect unauthenticated user to login**
   - ✅ No auth required
   - ✅ Redirect logic works
   - ✅ URL includes redirect parameter

3. **should show correct button states**
   - ✅ Different claim statuses display correctly
   - ✅ Buttons are enabled/disabled appropriately

4. **should handle form validation**
   - ✅ Email pre-fills from user context
   - ✅ Submit button state changes correctly

## Troubleshooting

### Tests fail with "storageState file not found"
- ✅ Run `npx playwright codegen --save-storage=playwright/.auth/user.json http://localhost:3000/login`
- ✅ Make sure you log in successfully before closing the browser
- ✅ Verify the file exists at `playwright/.auth/user.json`

### Tests timeout waiting for business
- ✅ Verify business exists in database
- ✅ Check business `claim_status` is 'unclaimed'
- ✅ Verify API route `/api/businesses/search` works
- ✅ Check that API mocking is working (tests mock the search API)

### Tests timeout after clicking claim
- ✅ Verify user is actually authenticated (check cookies/localStorage)
- ✅ Check API route `/api/business/claim` is accessible
- ✅ Verify business is claimable (not already claimed)
- ✅ Check browser console for errors

### API returns 401/403
- ✅ User not authenticated properly - recreate auth state
- ✅ RLS policies blocking access
- ✅ Missing required permissions

## Best Practices

- ✅ Always verify API responses, not just UI
- ✅ Check intermediate states (don't jump to final state)
- ✅ Use real authentication via storageState, not mocks
- ✅ Seed test data before tests run
- ✅ Clean up test data after tests complete
- ✅ Use proper timeouts (60s for full flows)
