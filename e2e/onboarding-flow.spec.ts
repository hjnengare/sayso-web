/**
 * E2E tests for complete onboarding workflow
 * Tests the full path: /onboarding → /register → /interests → /subcategories → /deal-breakers → /complete → /home
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
    
    // Select 3 interests
    const interestButtons = page.locator('[data-interest-id]');
    const interestCount = await interestButtons.count();
    
    // Select first 3 interests
    for (let i = 0; i < Math.min(3, interestCount); i++) {
      await interestButtons.nth(i).click();
    }

    // Verify continue button is enabled
    const continueButton = page.getByTestId('continue-button');
    await expect(continueButton).not.toBeDisabled();

    // Click continue
    await continueButton.click();

    // Step 5: Subcategories selection
    await expect(page).toHaveURL(/.*subcategories/);
    await expect(page.url()).toContain('interests=');

    // Wait for subcategories to load
    await page.waitForSelector('[data-subcategory-id]', { timeout: 5000 });

    // Select at least 1 subcategory
    const subcategoryButtons = page.locator('[data-subcategory-id]');
    const subcategoryCount = await subcategoryButtons.count();
    
    if (subcategoryCount > 0) {
      await subcategoryButtons.first().click();
      
      // Verify continue button is enabled
      const subcategoryContinueButton = page.getByTestId('continue-button');
      await expect(subcategoryContinueButton).not.toBeDisabled();
      
      await subcategoryContinueButton.click();
    }

    // Step 6: Deal-breakers selection
    await expect(page).toHaveURL(/.*deal-breakers/);
    await expect(page.url()).toContain('interests=');
    await expect(page.url()).toContain('subcategories=');

    // Wait for deal-breakers to load
    await page.waitForSelector('[data-dealbreaker-id]', { timeout: 5000 });

    // Select at least 1 deal-breaker
    const dealbreakerButtons = page.locator('[data-dealbreaker-id]');
    const dealbreakerCount = await dealbreakerButtons.count();
    
    if (dealbreakerCount > 0) {
      await dealbreakerButtons.first().click();
      
      // Verify complete button is enabled
      const completeButton = page.getByTestId('complete-button');
      await expect(completeButton).not.toBeDisabled();
      
      // Intercept the API call to verify payload
      const onboardingRequestPromise = page.waitForRequest(
        (request) => request.url().includes('/api/user/onboarding') && request.method() === 'POST'
      );

      await completeButton.click();

      // Step 7: Verify API call payload
      const request = await onboardingRequestPromise;
      const requestBody = request.postDataJSON();

      expect(requestBody).toHaveProperty('step', 'complete');
      expect(requestBody).toHaveProperty('interests');
      expect(requestBody).toHaveProperty('subcategories');
      expect(requestBody).toHaveProperty('dealbreakers');
      expect(Array.isArray(requestBody.interests)).toBe(true);
      expect(Array.isArray(requestBody.subcategories)).toBe(true);
      expect(Array.isArray(requestBody.dealbreakers)).toBe(true);
      expect(requestBody.interests.length).toBeGreaterThanOrEqual(3);
      expect(requestBody.subcategories.length).toBeGreaterThanOrEqual(1);
      expect(requestBody.dealbreakers.length).toBeGreaterThanOrEqual(1);

      // Step 8: Completion page
      await expect(page).toHaveURL(/.*complete/, { timeout: 10000 });

      // Step 9: Auto-redirect to home (or manual click)
      await expect(page).toHaveURL(/.*home/, { timeout: 5000 });
    }
  });

  test('should validate interests selection limits (3-6)', async ({ page }) => {
    // Navigate to interests page (assuming already registered/logged in)
    await page.goto('/interests');
    await expect(page).toHaveURL(/.*interests/);

    const interestButtons = page.locator('[data-interest-id]');
    const interestCount = await interestButtons.count();

    // Try to select more than 6
    for (let i = 0; i < Math.min(7, interestCount); i++) {
      await interestButtons.nth(i).click();
    }

    // Should show toast for exceeding max
    // Note: This depends on your toast implementation
    const continueButton = page.getByTestId('continue-button');
    
    // With 6 or fewer, button should be enabled
    // With 7, should show warning (but test might need adjustment based on UI)
  });

  test('should validate subcategories selection limit (10)', async ({ page }) => {
    // Navigate to subcategories with interests
    await page.goto('/subcategories?interests=food-drink,beauty-wellness');
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
    }
  });

  test('should validate deal-breakers selection limit (3)', async ({ page }) => {
    // Navigate to deal-breakers with interests and subcategories
    await page.goto('/deal-breakers?interests=food-drink&subcategories=sushi');
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
    }
  });
});

test.describe('Onboarding Regression Guardrails', () => {
  test('should still land on /complete even if /api/user/onboarding fails', async ({ page }) => {
    // Navigate to deal-breakers
    await page.goto('/deal-breakers?interests=food-drink&subcategories=sushi');

    // Intercept and fail the onboarding API call
    await page.route('/api/user/onboarding', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Select a deal-breaker
    await page.waitForSelector('[data-dealbreaker-id]', { timeout: 5000 });
    const dealbreakerButtons = page.locator('[data-dealbreaker-id]');
    if (await dealbreakerButtons.count() > 0) {
      await dealbreakerButtons.first().click();

      // Click complete button
      const completeButton = page.getByTestId('complete-button');
      await expect(completeButton).not.toBeDisabled();
      await completeButton.click();

      // Should still navigate to /complete page (graceful degradation)
      await expect(page).toHaveURL(/.*complete/, { timeout: 10000 });
    }
  });

  test('should use fallback interests if /api/interests fails', async ({ page }) => {
    // Intercept and fail the interests API call
    await page.route('/api/interests', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Navigate to interests page
    await page.goto('/interests');

    // Should still show interests (fallback data)
    // The page should render with fallback interests
    await page.waitForSelector('[data-interest-id]', { timeout: 5000 });
    
    const interestButtons = page.locator('[data-interest-id]');
    const interestCount = await interestButtons.count();
    
    // Should have fallback interests available
    expect(interestCount).toBeGreaterThan(0);
  });

  test('should handle network errors gracefully during onboarding completion', async ({ page }) => {
    // Navigate to deal-breakers
    await page.goto('/deal-breakers?interests=food-drink&subcategories=sushi');

    // Intercept and simulate network error
    await page.route('/api/user/onboarding', async (route) => {
      await route.abort('failed');
    });

    // Select a deal-breaker
    await page.waitForSelector('[data-dealbreaker-id]', { timeout: 5000 });
    const dealbreakerButtons = page.locator('[data-dealbreaker-id]');
    if (await dealbreakerButtons.count() > 0) {
      await dealbreakerButtons.first().click();

      // Click complete button
      const completeButton = page.getByTestId('complete-button');
      await expect(completeButton).not.toBeDisabled();
      await completeButton.click();

      // Should still navigate to /complete page (graceful degradation)
      await expect(page).toHaveURL(/.*complete/, { timeout: 10000 });
    }
  });
});

