import { test, expect } from '@playwright/test';

// iPhone 12 viewport
const iPhone = { width: 390, height: 844 };

const TEST_USER = {
  email: 'testuser+onboarding@example.com',
  password: 'TestPassword123!',
};

test.describe('Mobile Onboarding Happy Path', () => {
  test.use({ viewport: iPhone });

  test('should complete onboarding flow and not show again', async ({ page, context }) => {
    // 1) Login
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.fill('input[type="email"]', TEST_USER.email);

    await expect(page.locator('input[type="password"]')).toBeVisible();
    await page.fill('input[type="password"]', TEST_USER.password);

    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.click('button[type="submit"]'),
    ]);

    // 2) If user is already onboarded, they might not go to /interests.
    //    We expect either /interests (needs onboarding) OR a post-onboarding/home route.
    await page.waitForURL(/\/(interests|post-onboarding|for-you|home|discover)/, { timeout: 15000 });

    // If we are not on /interests, onboarding is already done — still verify it doesn't show.
    if (!page.url().includes('/interests')) {
      await expect(page.locator('[data-testid="interest-option"]')).toHaveCount(0);
      await expect(page.locator('text=onboarding')).toHaveCount(0);
      return;
    }

    // 3) Interests step
    await expect(page.locator('[data-testid="interest-option"]').first()).toBeVisible();

    // Confirm nothing is preselected (your app must set data-selected="true" on selected items)
    await expect(page.locator('[data-selected="true"]')).toHaveCount(0);

    await page.locator('[data-testid="interest-option"]').nth(0).click();
    await page.locator('[data-testid="interest-option"]').nth(1).click();

    const nextBtn1 = page.locator('button:has-text("Next")');
    await expect(nextBtn1).toBeEnabled();
    await Promise.all([
      page.waitForURL('**/subcategories', { timeout: 15000 }).catch(() => null),
      nextBtn1.click(),
    ]);

    // 4) Subcategories step
    await expect(page.locator('[data-testid="subcategory-option"]').first()).toBeVisible();
    await page.locator('[data-testid="subcategory-option"]').nth(0).click();

    const nextBtn2 = page.locator('button:has-text("Next")');
    await expect(nextBtn2).toBeEnabled();
    await Promise.all([
      page.waitForURL('**/dealbreakers', { timeout: 15000 }).catch(() => null),
      nextBtn2.click(),
    ]);

    // 5) Dealbreakers step
    await expect(page.locator('[data-testid="dealbreaker-option"]').first()).toBeVisible();
    await page.locator('[data-testid="dealbreaker-option"]').nth(0).click();

    const finishBtn = page.locator('button:has-text("Finish")');
    await expect(finishBtn).toBeEnabled();

    await Promise.all([
      page.waitForLoadState('networkidle'),
      finishBtn.click(),
    ]);

    // 6) Post-onboarding
    await page.waitForURL('**/post-onboarding', { timeout: 15000 });
    await expect(page).toHaveURL(/\/post-onboarding/);

    // 7) Hard verify "does not show again":
    //    (a) reload on same page
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/post-onboarding/);
    await expect(page.locator('text=onboarding')).toHaveCount(0);

    //    (b) open a new tab in SAME session (fresh navigation catches guard regressions)
    const page2 = await context.newPage();
    await page2.setViewportSize(iPhone);
    await page2.goto('/interests', { waitUntil: 'networkidle' });

    // Should get redirected away, OR the onboarding UI should not be present.
    // (choose one of these patterns depending on how your guard works)
    if (page2.url().includes('/interests')) {
      await expect(page2.locator('[data-testid="interest-option"]')).toHaveCount(0);
    } else {
      await expect(page2).not.toHaveURL(/\/interests/);
    }
  });
});
