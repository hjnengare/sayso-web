/**
 * E2E tests for complete onboarding workflow (localStorage-first architecture)
 * Tests the full path: /onboarding → /register → /interests → /subcategories → /deal-breakers → /complete → /home
 *
 * Architecture: Selections are stored in localStorage during interests/subcategories/dealbreakers,
 * then all data is saved to Supabase in a single transaction on the complete page.
 */

import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from onboarding landing page
    await page.goto('/onboarding');
  });

  test('should complete full onboarding flow from start to finish', async ({ page }) => {
    // Step 1: Landing page → Register
    await expect(page).toHaveURL(/.*onboarding/);

    // Click "Get Started" button
    const getStartedButton = page.getByRole('link', { name: /get started/i });
    await getStartedButton.click();

    // Step 2: Registration page
    await expect(page).toHaveURL(/.*register/);

    // Fill registration form
    const email = `test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPassword123!');

    // Submit registration
    await page.click('button[type="submit"]');

    // Step 3: Wait for email verification or redirect to interests
    // Note: In test environment, email verification might be skipped
    await page.waitForURL(/.*interests|.*verify-email/, { timeout: 10000 });

    // If redirected to verify-email, we'll need to handle that
    // For now, assume we can proceed to interests
    if (page.url().includes('/verify-email')) {
      // In a real test, you might need to mock email verification
      // or use a test account that's already verified
      test.skip();
    }

    // Step 4: Interests selection (3-6 required)
    await expect(page).toHaveURL(/.*interests/);

    // Verify page loads instantly without loader (localStorage-first)
    const interestButtons = page.locator('[data-interest-id]');
    await expect(interestButtons.first()).toBeVisible({ timeout: 2000 });

    const interestCount = await interestButtons.count();

    // Select first 3 interests
    const selectedInterests = [];
    for (let i = 0; i < Math.min(3, interestCount); i++) {
      const button = interestButtons.nth(i);
      const interestId = await button.getAttribute('data-interest-id');
      selectedInterests.push(interestId);
      await button.click();
    }

    // Verify localStorage was updated
    const localStorageInterests = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('onboarding_interests') || '[]');
    });
    expect(localStorageInterests.length).toBe(3);

    // Verify continue button is enabled
    const continueButton = page.getByTestId('continue-button');
    await expect(continueButton).not.toBeDisabled();

    // Click continue - should navigate without API call
    await continueButton.click();

    // Step 5: Subcategories selection
    await expect(page).toHaveURL(/.*subcategories/);

    // Wait for subcategories to load (filtered by selected interests)
    await page.waitForSelector('[data-subcategory-id]', { timeout: 5000 });

    // Select at least 1 subcategory
    const subcategoryButtons = page.locator('[data-subcategory-id]');
    const subcategoryCount = await subcategoryButtons.count();

    if (subcategoryCount > 0) {
      await subcategoryButtons.first().click();

      // Verify localStorage was updated
      const localStorageSubcategories = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('onboarding_subcategories') || '[]');
      });
      expect(localStorageSubcategories.length).toBeGreaterThanOrEqual(1);

      // Verify continue button is enabled
      const subcategoryContinueButton = page.getByTestId('continue-button');
      await expect(subcategoryContinueButton).not.toBeDisabled();

      await subcategoryContinueButton.click();
    }

    // Step 6: Deal-breakers selection
    await expect(page).toHaveURL(/.*deal-breakers/);

    // Wait for deal-breakers to load
    await page.waitForSelector('[data-dealbreaker-id]', { timeout: 5000 });

    // Select at least 1 deal-breaker
    const dealbreakerButtons = page.locator('[data-dealbreaker-id]');
    const dealbreakerCount = await dealbreakerButtons.count();

    if (dealbreakerCount > 0) {
      await dealbreakerButtons.first().click();

      // Verify localStorage was updated
      const localStorageDealbreakers = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('onboarding_dealbreakers') || '[]');
      });
      expect(localStorageDealbreakers.length).toBeGreaterThanOrEqual(1);

      // Verify complete button is enabled
      const completeButton = page.getByTestId('complete-button');
      await expect(completeButton).not.toBeDisabled();

      await completeButton.click();

      // Step 7: Complete page
      await expect(page).toHaveURL(/.*complete/, { timeout: 10000 });

      // Wait for "Continue to Home" button
      const continueToHomeButton = page.getByRole('button', { name: /continue to home/i });
      await expect(continueToHomeButton).toBeVisible({ timeout: 5000 });

      // Intercept the API call to verify payload (should happen when clicking Continue to Home)
      const onboardingRequestPromise = page.waitForRequest(
        (request) => request.url().includes('/api/onboarding/complete') && request.method() === 'POST'
      );

      // Click "Continue to Home" - this triggers the save to Supabase
      await continueToHomeButton.click();

      // Step 8: Verify API call payload
      const request = await onboardingRequestPromise;
      const requestBody = request.postDataJSON();

      // Verify all data is sent in a single request
      expect(requestBody).toHaveProperty('interests');
      expect(requestBody).toHaveProperty('subcategories');
      expect(requestBody).toHaveProperty('dealbreakers');
      expect(Array.isArray(requestBody.interests)).toBe(true);
      expect(Array.isArray(requestBody.subcategories)).toBe(true);
      expect(Array.isArray(requestBody.dealbreakers)).toBe(true);
      expect(requestBody.interests.length).toBeGreaterThanOrEqual(3);
      expect(requestBody.subcategories.length).toBeGreaterThanOrEqual(1);
      expect(requestBody.dealbreakers.length).toBeGreaterThanOrEqual(1);

      // Step 9: Verify localStorage was cleared after successful save
      await page.waitForURL(/.*home/, { timeout: 5000 });

      const clearedLocalStorage = await page.evaluate(() => {
        return {
          interests: localStorage.getItem('onboarding_interests'),
          subcategories: localStorage.getItem('onboarding_subcategories'),
          dealbreakers: localStorage.getItem('onboarding_dealbreakers'),
        };
      });

      // localStorage should be cleared after successful completion
      expect(clearedLocalStorage.interests).toBeNull();
      expect(clearedLocalStorage.subcategories).toBeNull();
      expect(clearedLocalStorage.dealbreakers).toBeNull();
    }
  });

  test('should NOT show loading state on interests page', async ({ page }) => {
    // Navigate directly to interests page
    await page.goto('/interests');
    await expect(page).toHaveURL(/.*interests/);

    // Page should load instantly without showing loader
    const interestButtons = page.locator('[data-interest-id]');

    // Interests should be visible immediately (no API call, static data)
    await expect(interestButtons.first()).toBeVisible({ timeout: 1000 });

    // Verify no loader is shown
    const loader = page.locator('[data-testid="loader"]');
    await expect(loader).not.toBeVisible();
  });

  test('should persist selections across page reloads using localStorage', async ({ page }) => {
    // Navigate to interests page
    await page.goto('/interests');
    await expect(page).toHaveURL(/.*interests/);

    // Select 3 interests
    const interestButtons = page.locator('[data-interest-id]');
    for (let i = 0; i < 3; i++) {
      await interestButtons.nth(i).click();
    }

    // Get selected interest IDs
    const selectedIds = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('onboarding_interests') || '[]');
    });
    expect(selectedIds.length).toBe(3);

    // Reload the page
    await page.reload();

    // Verify selections are still active after reload
    const reloadedSelections = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('onboarding_interests') || '[]');
    });
    expect(reloadedSelections).toEqual(selectedIds);

    // Verify UI reflects the persisted selections
    for (let i = 0; i < 3; i++) {
      const button = interestButtons.nth(i);
      await expect(button).toHaveClass(/selected|active/);
    }
  });

  test('should validate interests selection limits (3-6)', async ({ page }) => {
    // Navigate to interests page
    await page.goto('/interests');
    await expect(page).toHaveURL(/.*interests/);

    const interestButtons = page.locator('[data-interest-id]');
    const interestCount = await interestButtons.count();

    // Select minimum (3)
    for (let i = 0; i < 3; i++) {
      await interestButtons.nth(i).click();
    }

    // Continue button should be enabled
    const continueButton = page.getByTestId('continue-button');
    await expect(continueButton).not.toBeDisabled();

    // Try to select more than 6
    for (let i = 3; i < Math.min(7, interestCount); i++) {
      await interestButtons.nth(i).click();
    }

    // If 7th was clicked, should show toast warning
    if (interestCount > 6) {
      // Toast should be visible (implementation-specific selector)
      const toast = page.locator('[role="alert"], .toast');
      await expect(toast).toBeVisible({ timeout: 2000 });
    }
  });

  test('should validate subcategories selection limit (10)', async ({ page }) => {
    // Navigate with pre-selected interests in localStorage
    await page.goto('/interests');

    // Select interests via localStorage
    await page.evaluate(() => {
      localStorage.setItem('onboarding_interests', JSON.stringify(['food-drink', 'beauty-wellness']));
    });

    // Navigate to subcategories
    await page.goto('/subcategories');
    await expect(page).toHaveURL(/.*subcategories/);

    // Wait for subcategories to load
    await page.waitForSelector('[data-subcategory-id]', { timeout: 5000 });

    const subcategoryButtons = page.locator('[data-subcategory-id]');
    const subcategoryCount = await subcategoryButtons.count();

    // Select up to 10
    for (let i = 0; i < Math.min(10, subcategoryCount); i++) {
      await subcategoryButtons.nth(i).click();
    }

    // Try to select 11th (if available)
    if (subcategoryCount > 10) {
      await subcategoryButtons.nth(10).click();
      // Should show warning toast
      const toast = page.locator('[role="alert"], .toast');
      await expect(toast).toBeVisible({ timeout: 2000 });
    }
  });

  test('should validate deal-breakers selection limit (3)', async ({ page }) => {
    // Set up localStorage with interests and subcategories
    await page.goto('/interests');
    await page.evaluate(() => {
      localStorage.setItem('onboarding_interests', JSON.stringify(['food-drink']));
      localStorage.setItem('onboarding_subcategories', JSON.stringify(['restaurants']));
    });

    // Navigate to deal-breakers
    await page.goto('/deal-breakers');
    await expect(page).toHaveURL(/.*deal-breakers/);

    // Wait for deal-breakers to load
    await page.waitForSelector('[data-dealbreaker-id]', { timeout: 5000 });

    const dealbreakerButtons = page.locator('[data-dealbreaker-id]');
    const dealbreakerCount = await dealbreakerButtons.count();

    // Select 3 deal-breakers
    for (let i = 0; i < Math.min(3, dealbreakerCount); i++) {
      await dealbreakerButtons.nth(i).click();
    }

    // Try to select 4th (if available)
    if (dealbreakerCount > 3) {
      await dealbreakerButtons.nth(3).click();
      // Should show warning toast
      const toast = page.locator('[role="alert"], .toast');
      await expect(toast).toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('Onboarding Error Handling', () => {
  test('should handle API failure on complete page gracefully', async ({ page }) => {
    // Set up localStorage with complete onboarding data
    await page.goto('/interests');
    await page.evaluate(() => {
      localStorage.setItem('onboarding_interests', JSON.stringify(['food-drink', 'beauty-wellness', 'professional-services']));
      localStorage.setItem('onboarding_subcategories', JSON.stringify(['restaurants', 'gyms']));
      localStorage.setItem('onboarding_dealbreakers', JSON.stringify(['trustworthiness']));
    });

    // Navigate to complete page
    await page.goto('/complete');

    // Intercept and fail the onboarding complete API call
    await page.route('/api/onboarding/complete', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Click "Continue to Home" button
    const continueButton = page.getByRole('button', { name: /continue to home/i });
    await continueButton.click();

    // Should show error toast
    const toast = page.locator('[role="alert"], .toast');
    await expect(toast).toBeVisible({ timeout: 3000 });
    await expect(toast).toContainText(/failed|error/i);

    // Should NOT navigate to home page on error
    await expect(page).toHaveURL(/.*complete/);

    // localStorage should NOT be cleared (so user can retry)
    const persistedData = await page.evaluate(() => {
      return {
        interests: localStorage.getItem('onboarding_interests'),
        subcategories: localStorage.getItem('onboarding_subcategories'),
        dealbreakers: localStorage.getItem('onboarding_dealbreakers'),
      };
    });

    expect(persistedData.interests).not.toBeNull();
    expect(persistedData.subcategories).not.toBeNull();
    expect(persistedData.dealbreakers).not.toBeNull();
  });

  test('should handle network errors gracefully on complete page', async ({ page }) => {
    // Set up localStorage with complete onboarding data
    await page.goto('/interests');
    await page.evaluate(() => {
      localStorage.setItem('onboarding_interests', JSON.stringify(['food-drink', 'beauty-wellness', 'professional-services']));
      localStorage.setItem('onboarding_subcategories', JSON.stringify(['restaurants']));
      localStorage.setItem('onboarding_dealbreakers', JSON.stringify(['trustworthiness']));
    });

    // Navigate to complete page
    await page.goto('/complete');

    // Intercept and simulate network error
    await page.route('/api/onboarding/complete', async (route) => {
      await route.abort('failed');
    });

    // Click "Continue to Home" button
    const continueButton = page.getByRole('button', { name: /continue to home/i });
    await continueButton.click();

    // Should show error message
    const toast = page.locator('[role="alert"], .toast');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });
});
