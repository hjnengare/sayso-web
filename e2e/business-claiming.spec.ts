/**
 * E2E tests for business claiming flow
 * 
 * IMPORTANT SETUP REQUIREMENTS:
 * 1. Create authenticated user state: npx playwright codegen --save-storage=auth.json
 * 2. Seed a claimable business in test database before running tests
 * 3. Ensure test user has completed onboarding
 * 
 * Tests the complete user journey:
 * 1. User searches for a business
 * 2. User clicks claim button
 * 3. User fills out claim form
 * 4. User submits claim
 * 5. Success feedback is shown
 */

import { test, expect } from '@playwright/test';

// Use authenticated state for faster, more reliable tests
// To create: npx playwright codegen --save-storage=playwright/.auth/user.json http://localhost:3000/login
// Then log in manually in the browser window that opens, and close it when done.
// The auth state will be saved and reused for all tests.
test.use({ 
  storageState: process.env.PLAYWRIGHT_AUTH_STATE || 'playwright/.auth/user.json' 
});

test.describe('Business Claiming Flow', () => {
  // Test business ID - must exist in database and be unclaimed
  const TEST_BUSINESS_ID = 'test-business-claimable-1';
  const TEST_BUSINESS_NAME = 'Test Claimable Restaurant';
  
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for setup operations
    test.setTimeout(60000);
    
    // Block noisy third-party requests that prevent networkidle
    await page.route('**/*', (route) => {
      const url = route.request().url();
      // Block analytics, ads, tracking, maps, Supabase realtime (if not needed)
      if (
        url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('googleapis.com/maps') ||
        url.includes('gtag') ||
        url.includes('analytics') ||
        url.includes('doubleclick') ||
        url.includes('facebook.net') ||
        url.includes('facebook.com/tr') ||
        url.includes('supabase.co/realtime') || // Block Supabase realtime websocket
        url.includes('supabase.co/rest/v1') && url.includes('realtime') // Block realtime REST calls
      ) {
        return route.abort();
      }
      return route.continue();
    });
    
    // Mock API responses for business search (ALWAYS mock to avoid DB dependency)
    // Use regex pattern to ensure it matches the route
    await page.route(/.*\/api\/businesses\/search.*/, async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('query');
      
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (query && query.trim().length >= 2) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businesses: [
              {
                id: TEST_BUSINESS_ID,
                name: TEST_BUSINESS_NAME,
                category: 'Restaurant',
                location: 'Cape Town',
                address: '123 Main St',
                verified: false,
                claim_status: 'unclaimed',
                pending_by_user: false,
                claimed_by_user: false,
              },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ businesses: [] }),
        });
      }
    });
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
    
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
    });
    
    page.on('requestfailed', req => {
      console.log('REQ FAIL:', req.url(), req.failure()?.errorText);
    });
  });

  test('should allow authenticated user to claim a business', async ({ page }) => {
    test.setTimeout(60000);
    
    // Track API responses
    let claimResponse: any = null;
    
    // Intercept and verify claim API call
    page.on('response', async (response) => {
      if (response.url().includes('/api/business/claim') && response.status() === 200) {
        claimResponse = await response.json();
      }
    });

    // Step 1: Authenticate user (REAL LOGIN - not mocked)
    // IMPORTANT: Use real credentials from environment or test setup
    const testUserEmail = process.env.E2E_TEST_USER_EMAIL || 'test@example.com';
    const testUserPassword = process.env.E2E_TEST_USER_PASSWORD || 'password123';
    
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    // Use role-based selector to avoid strict mode violation (multiple "sign in" texts exist)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10000 });
    
    // Fill login form
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /sign in/i });
    
    await emailInput.fill(testUserEmail);
    await passwordInput.fill(testUserPassword);
    await submitButton.click();
    
    // Wait for successful login - verify we're authenticated
    await page.waitForURL(/.*home|.*claim-business/, { timeout: 15000 });
    
    // Verify user is authenticated by checking for user-specific UI elements
    // (e.g., profile button, user menu, etc.)
    // If this fails, authentication didn't work - fix auth setup first
    
    // Step 2: Navigate to claim business page
    // Use domcontentloaded instead of networkidle (Supabase keeps connections open)
    await page.goto('/claim-business', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to be ready - check for test ID first, then search input
    await expect(page.getByTestId('claim-business-page')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByPlaceholder(/search for your business/i)
    ).toBeVisible({ timeout: 10000 });
    
    // Optionally wait for networkidle with timeout (don't fail if it never happens)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
      // Ignore - networkidle may never happen with Supabase connections
    });

    // Step 3: Search for business
    const searchInput = page.getByPlaceholder(/search for your business/i);
    
    // Clear any existing text first
    await searchInput.clear();
    await searchInput.fill('Test Claimable');
    
    // Small delay to ensure input is registered
    await page.waitForTimeout(100);
    
    // Wait for debounce (300ms) + API call + render
    // Step 3: Wait for search results to appear (debounce + API call)
    await expect(page.getByText(TEST_BUSINESS_NAME)).toBeVisible({ timeout: 15000 });

    // Step 4: Find and click claim button
    const claimButton = page.getByRole('button', { name: /claim this business/i }).first();
    
    // Ensure button is ready
    await expect(claimButton).toBeVisible({ timeout: 5000 });
    await expect(claimButton).toBeEnabled();
    await claimButton.scrollIntoViewIfNeeded();
    
    await claimButton.click();

    // Step 5: Wait for modal to open
    await expect(page.getByText('Claim Business')).toBeVisible({ timeout: 5000 });

    // Step 6: Verify form fields are present and email is pre-filled
    await expect(page.getByText(/Your Role/i)).toBeVisible();
    const emailInputField = page.getByLabel(/Email/i);
    await expect(emailInputField).toBeVisible();
    // Email should be pre-filled from authenticated user context
    await expect(emailInputField).not.toHaveValue('', { timeout: 3000 });
    
    // Step 7: Select manager role (default is owner)
    const managerButton = page.getByRole('button', { name: /manager/i });
    await managerButton.click();

    // Step 8: Fill in optional fields
    const phoneInput = page.getByLabel(/Phone/i);
    await phoneInput.fill('+27123456789');

    const notesInput = page.getByLabel(/Additional Notes/i);
    await notesInput.fill('I manage this restaurant and would like to claim it.');

    // Step 9: Wait for API response when submitting
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/business/claim') && response.status() === 200,
      { timeout: 15000 }
    );

    // Step 10: Submit claim
    const claimSubmitButton = page.getByRole('button', { name: /submit claim/i });
    await claimSubmitButton.click();

    // Step 11: Verify API response was successful
    const response = await responsePromise;
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.request).toBeDefined();
    expect(responseData.request.business_id).toBe(TEST_BUSINESS_ID);

    // Step 12: Verify intermediate state - success message or modal closes
    // Check for success toast/message
    await expect(
      page.getByText(/claim.*submitted|success/i)
    ).toBeVisible({ timeout: 5000 }).catch(async () => {
      // If no success message, modal should close
      await expect(page.getByText('Claim Business')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test('should redirect unauthenticated user to login when clicking claim', async ({ page }) => {
    // Navigate to claim business page without login
    await page.goto('/claim-business', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to be ready
    await expect(page.getByTestId('claim-business-page')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByPlaceholder(/search for your business/i)
    ).toBeVisible({ timeout: 10000 });

    // Search for business
    const searchInput = page.getByPlaceholder(/search for your business/i);
    await searchInput.clear();
    
    // Type character by character to trigger search properly
    await searchInput.fill('Test Claimable');
    
    // Wait a bit for input to register
    await page.waitForTimeout(150);
    
    // Wait for search results (debounce 300ms + API call + render)
    // The API should be mocked, so results should appear
    await expect(page.getByText(TEST_BUSINESS_NAME)).toBeVisible({ timeout: 15000 });

    // Find claim button - use first() to handle multiple matches
    const claimButton = page.getByRole('button', { name: /claim this business|log in to claim/i }).first();
    
    // Ensure button is visible and enabled
    await expect(claimButton).toBeVisible({ timeout: 5000 });
    await expect(claimButton).toBeEnabled();
    
    // Scroll into view if needed (mobile)
    await claimButton.scrollIntoViewIfNeeded();
    
    // Click and wait for URL change (better than waitForNavigation for client-side routing)
    await Promise.all([
      page.waitForURL(/.*login.*redirect.*claim-business/, { timeout: 15000 }),
      claimButton.click(),
    ]);
  });

  test('should show correct button states based on claim status', async ({ page }) => {
    test.setTimeout(60000);
    
    // Mock different claim statuses
    await page.route('**/api/businesses/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          businesses: [
            {
              id: 'unclaimed-business',
              name: 'Unclaimed Business',
              category: 'Restaurant',
              location: 'Cape Town',
              claim_status: 'unclaimed',
              pending_by_user: false,
              claimed_by_user: false,
            },
            {
              id: 'pending-business',
              name: 'Pending Business',
              category: 'Cafe',
              location: 'Johannesburg',
              claim_status: 'pending',
              pending_by_user: true,
              claimed_by_user: false,
            },
            {
              id: 'claimed-business',
              name: 'Claimed Business',
              category: 'Shop',
              location: 'Durban',
              claim_status: 'claimed',
              pending_by_user: false,
              claimed_by_user: false,
            },
          ],
        }),
      });
    });

    // Authenticate user
    const testUserEmail = process.env.E2E_TEST_USER_EMAIL || 'test@example.com';
    const testUserPassword = process.env.E2E_TEST_USER_PASSWORD || 'password123';
    
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    // Use role-based selector to avoid strict mode violation (multiple "sign in" texts exist)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="email"]').fill(testUserEmail);
    await page.locator('input[type="password"]').fill(testUserPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/.*home|.*claim-business/, { timeout: 15000 });

    await page.goto('/claim-business', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('claim-business-page')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByPlaceholder(/search for your business/i)
    ).toBeVisible({ timeout: 10000 });

    // Search
    const searchInput = page.getByPlaceholder(/search for your business/i);
    await searchInput.clear();
    await searchInput.fill('business');
    await page.waitForTimeout(150); // Wait for input to register
    await page.waitForTimeout(500);

    // Verify unclaimed business shows claim button
    await expect(page.getByText('Unclaimed Business')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /claim this business/i })).toBeVisible();

    // Verify pending business shows disabled button
    await expect(page.getByText('Pending Business')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /claim pending review/i })).toBeDisabled();

    // Verify claimed business shows contact support
    await expect(page.getByText('Claimed Business')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /contact support/i })).toBeVisible();
  });

  test('should handle form validation', async ({ page }) => {
    test.setTimeout(60000);
    
    // User is already authenticated via storageState - navigate directly
    await page.goto('/claim-business', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('claim-business-page')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByPlaceholder(/search for your business/i)
    ).toBeVisible({ timeout: 10000 });

    // Search and open modal
    const searchInput = page.getByPlaceholder(/search for your business/i);
    await searchInput.clear();
    await searchInput.fill('Test Claimable');
    await page.waitForTimeout(150); // Wait for debounce
    await expect(page.getByText(TEST_BUSINESS_NAME)).toBeVisible({ timeout: 15000 });

    const claimButton = page.getByRole('button', { name: /claim this business/i }).first();
    await expect(claimButton).toBeVisible({ timeout: 5000 });
    await expect(claimButton).toBeEnabled();
    await claimButton.scrollIntoViewIfNeeded();
    await claimButton.click();
    await expect(page.getByText('Claim Business')).toBeVisible({ timeout: 5000 });

    // Email should be pre-filled from authenticated user context
    const emailInput = page.getByLabel(/Email/i);
    // Just verify email is not empty (don't check exact value since we don't know the test user email)
    await expect(emailInput).not.toHaveValue('', { timeout: 3000 });
    
    // Get the actual email value for later use
    const userEmail = await emailInput.inputValue();

    // Submit button should be enabled with pre-filled email
    const submitButton = page.getByRole('button', { name: /submit claim/i });
    await expect(submitButton).not.toBeDisabled();

    // Clear email - submit should be disabled
    await emailInput.clear();
    await expect(submitButton).toBeDisabled();

    // Re-enter email - submit should be enabled
    await emailInput.fill(userEmail);
    await expect(submitButton).not.toBeDisabled();
  });
});

