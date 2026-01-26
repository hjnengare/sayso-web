import { test, expect } from '@playwright/test';

// iPhone 12 viewport
const iPhone = { width: 390, height: 844 };

/**
 * IMPORTANT: This test user MUST exist in your database.
 * Create it via Supabase Auth dashboard or your registration flow.
 *
 * The email should be a real test account you control.
 */
const TEST_USER = {
  // TODO: Replace with an actual test user that exists in your database
  email: process.env.TEST_USER_EMAIL || 'testuser+onboarding@example.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
};

test.describe('Mobile Onboarding Happy Path', () => {
  test.use({ viewport: iPhone });

  test('should complete onboarding flow and not show again', async ({ page, context }) => {
    // Reset onboarding state for test user
    const resetResponse = await page.request.post('/api/test/reset-onboarding', {
      data: { email: TEST_USER.email }
    });

    // Log reset response for debugging
    const resetData = await resetResponse.json().catch(() => ({}));
    console.log('[Test] Reset API response:', resetResponse.status(), resetData);

    // If user doesn't exist, skip the test with a helpful message
    if (resetResponse.status() === 404) {
      test.skip(true, `Test user "${TEST_USER.email}" does not exist. Create this user first or set TEST_USER_EMAIL env var.`);
      return;
    }

    expect(resetResponse.ok()).toBeTruthy();

    // 1) Login
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Wait for form to be interactive
    const emailInput = page.locator('input[type="email"], input[placeholder*="example.com"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(TEST_USER.email);

    const passwordInput = page.locator('input[type="password"], input[placeholder*="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(TEST_USER.password);

    // Wait for form validation to complete
    await page.waitForTimeout(500);

    // Click submit and wait for navigation
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for navigation away from login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // 2) After login, user should be redirected based on onboarding state:
    //    - If onboarding_complete = false → /interests
    //    - If onboarding_complete = true → /home
    //    We reset to incomplete, so we should go to /interests
    await expect(page).toHaveURL(/\/interests/, { timeout: 15000 });

    // 3) Interests step - select 3 interests (minimum required)
    const interestOptions = page.locator('[data-testid="interest-option"]');
    await expect(interestOptions.first()).toBeVisible({ timeout: 10000 });

    // Select 3 interests (minimum required)
    await interestOptions.nth(0).click();
    await interestOptions.nth(1).click();
    await interestOptions.nth(2).click();

    // Click Next/Continue
    const nextBtn1 = page.locator('button:has-text("Next"), button:has-text("Continue")');
    await expect(nextBtn1).toBeEnabled({ timeout: 5000 });
    await nextBtn1.click();

    // 4) Subcategories step
    await expect(page).toHaveURL(/\/subcategories/, { timeout: 10000 });
    const subcategoryOptions = page.locator('[data-testid="subcategory-option"]');
    await expect(subcategoryOptions.first()).toBeVisible({ timeout: 10000 });

    // Select at least 1 subcategory
    await subcategoryOptions.nth(0).click();

    const nextBtn2 = page.locator('button:has-text("Next"), button:has-text("Continue")');
    await expect(nextBtn2).toBeEnabled({ timeout: 5000 });
    await nextBtn2.click();

    // 5) Dealbreakers step
    await expect(page).toHaveURL(/\/deal-breakers/, { timeout: 10000 });
    const dealbreakerOptions = page.locator('[data-testid="dealbreaker-option"]');
    await expect(dealbreakerOptions.first()).toBeVisible({ timeout: 10000 });

    // Select at least 1 dealbreaker
    await dealbreakerOptions.nth(0).click();

    // Click Finish/Continue - this triggers atomic completion
    const finishBtn = page.locator('button:has-text("Finish"), button:has-text("Continue")');
    await expect(finishBtn).toBeEnabled({ timeout: 5000 });
    await finishBtn.click();

    // 6) Should land on /complete (celebration) then redirect to /home
    // Or go directly to /home
    await expect(page).toHaveURL(/\/(complete|home)/, { timeout: 15000 });

    // If on /complete, wait for auto-redirect to /home
    if (page.url().includes('/complete')) {
      await expect(page).toHaveURL(/\/home/, { timeout: 10000 });
    }

    // 7) Verify onboarding is complete - try to access /interests
    await page.goto('/interests');

    // Should be redirected away from /interests (middleware blocks completed users)
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 });

    // 8) Refresh and confirm still on /home (not redirected to onboarding)
    await page.reload();
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 });

    console.log('[Test] Onboarding flow completed successfully');
  });
});
