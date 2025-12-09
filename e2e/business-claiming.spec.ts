/**
 * E2E tests for business claiming flow
 */

import { test, expect } from '@playwright/test';

test.describe('Business Claiming Flow', () => {
  test('should allow authenticated user to claim a business', async ({ page }) => {
    // Login as user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to claim business page
    await page.goto('/for-businesses');

    // Search for business
    await page.fill('input[name="search"]', 'Test Restaurant');
    await page.click('button[type="submit"]');

    // Click claim button
    await page.click('text=Claim This Business');

    // Fill claim form
    await page.fill('input[name="businessName"]', 'Test Restaurant');
    await page.fill('input[name="email"]', 'owner@testrestaurant.com');
    await page.fill('input[name="phone"]', '+27123456789');

    // Submit claim
    await page.click('button[type="submit"]');

    // Verify success message
    await expect(page.locator('text=Claim submitted successfully')).toBeVisible();
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Try to access claim page without login
    await page.goto('/for-businesses');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show business owner dashboard after claiming', async ({ page }) => {
    // Login as business owner
    await page.goto('/business/login');
    await page.fill('input[name="email"]', 'owner@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to owners dashboard
    await expect(page).toHaveURL(/.*owners/);

    // Verify claimed businesses are listed
    await expect(page.locator('text=My Businesses')).toBeVisible();
  });
});

