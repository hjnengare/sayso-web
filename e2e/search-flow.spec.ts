/**
 * E2E tests for search and navigation flow
 */

import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test('should search for businesses and navigate to business page', async ({ page }) => {
    await page.goto('/home');

    // Perform search
    await page.fill('input[name="search"]', 'restaurant');
    await page.click('button[type="submit"]');

    // Verify search results appear
    await expect(page.locator('[data-testid="business-card"]').first()).toBeVisible();

    // Click on a business
    await page.click('[data-testid="business-card"]').first();

    // Verify navigation to business page
    await expect(page).toHaveURL(/.*business\/.*/);
    await expect(page.locator('h1')).toBeVisible(); // Business name
  });

  test('should filter search results', async ({ page }) => {
    await page.goto('/home');

    // Perform search
    await page.fill('input[name="search"]', 'restaurant');
    await page.click('button[type="submit"]');

    // Apply filters
    await page.click('text=Price Range');
    await page.click('text=$$');

    await page.click('text=Rating');
    await page.click('text=4+ stars');

    // Verify filtered results
    await expect(page.locator('[data-testid="business-card"]').first()).toBeVisible();
  });

  test('should save/bookmark a business', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to business page
    await page.goto('/business/test-business-123');

    // Click bookmark button
    await page.click('[data-testid="bookmark-button"]');

    // Verify success message
    await expect(page.locator('text=Added to bookmarks')).toBeVisible();

    // Navigate to saved businesses
    await page.goto('/saved');

    // Verify business appears in saved list
    await expect(page.locator('text=Test Business')).toBeVisible();
  });

  test('should display personalized For-You feed', async ({ page }) => {
    // Login with user preferences
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to For You page
    await page.goto('/for-you');

    // Verify personalized businesses are shown
    await expect(page.locator('text=For You')).toBeVisible();
    await expect(page.locator('[data-testid="business-card"]').first()).toBeVisible();

    // Verify businesses match user preferences
    // (This would require checking business categories match user interests)
  });
});

