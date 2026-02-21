# Business Owner Review Response E2E Tests Setup Guide

## ⚠️ Important Setup Requirements

These tests use Playwright's `storageState` to authenticate business owners, which makes them faster and more reliable. **You must create an authenticated session before running tests.**

## Quick Start

### 1. Create Authenticated Owner Session (Required)

Run this command to open a browser window where you'll log in as a business owner:

```bash
# Start your dev server first
npm run dev

# In another terminal, run codegen
npx playwright codegen --save-storage=playwright/.auth/owner.json http://localhost:3000/login
```

**Steps:**
1. A browser window will open to the login page
2. Log in with **business owner credentials** (user who has claimed a business)
3. Once logged in, close the browser window
4. The authentication state will be saved to `playwright/.auth/owner.json`

**Note**: This file is gitignored and should not be committed. Each developer needs to create their own auth state.

### 2. Run Tests

```bash
npm run test:e2e -- business-owner-review-response
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

## Prerequisites

1. **Test Database**: Ensure you have a test database set up
2. **Business Owner Account**: Create a test user account that:
   - Has claimed a business (or use existing claimed business)
   - Has access to business owner features
3. **Test Business with Reviews**: Ensure the test business has at least one review
4. **Authenticated Session**: Run `npx playwright codegen` to create the auth state file (see Quick Start above)

## What Each Test Verifies

1. **should allow owner to write a reply to a review**
   - ✅ Owner can see "Write a Reply" button
   - ✅ Reply form opens correctly
   - ✅ Reply can be submitted
   - ✅ Reply appears after submission

2. **should allow owner to edit their reply**
   - ✅ Edit button is visible for owner replies
   - ✅ Edit form pre-fills with existing reply
   - ✅ Reply can be updated
   - ✅ Updated reply appears correctly

3. **should allow owner to delete their reply**
   - ✅ Delete button is visible for owner replies
   - ✅ Confirmation dialog appears
   - ✅ Reply is removed after confirmation

4. **should disable submit button when reply text is empty**
   - ✅ Form validation works
   - ✅ Submit button state changes correctly

5. **should show "Message Customer" button for owners**
   - ✅ Owner-specific actions are visible
   - ✅ Message customer functionality is accessible

## Troubleshooting

### Tests fail with "storageState file not found"
- ✅ Run `npx playwright codegen --save-storage=playwright/.auth/owner.json http://localhost:3000/login`
- ✅ Make sure you log in as a **business owner** (not regular user)
- ✅ Verify the file exists at `playwright/.auth/owner.json`

### Tests timeout waiting for reviews
- ✅ Verify business has reviews in database
- ✅ Check that reviews API route works
- ✅ Verify API mocking is working (tests mock the reviews API)

### "Write a Reply" button not visible
- ✅ Verify user is actually a business owner (has claimed business)
- ✅ Check that `isOwnerView` prop is set correctly
- ✅ Verify business ownership in database

### API returns 401/403
- ✅ User not authenticated properly - recreate auth state
- ✅ User is not a business owner - use owner account
- ✅ RLS policies blocking access
- ✅ Missing required permissions

## Best Practices

- ✅ Always verify API responses, not just UI
- ✅ Check intermediate states (don't jump to final state)
- ✅ Use real authentication via storageState, not mocks
- ✅ Seed test data before tests run
- ✅ Clean up test data after tests complete
- ✅ Use proper timeouts (60s for full flows)

## Related Tests

- **Component UI Tests**: `__tests__/components/ReviewCard.test.tsx` - Isolated UI behavior tests
- **API Tests**: `__tests__/api/reviews.test.ts` - Backend API contract tests
- **Integration Tests**: `__tests__/integration/review-flow.test.tsx` - Integration tests

