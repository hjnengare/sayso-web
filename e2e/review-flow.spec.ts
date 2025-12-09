/**
 * E2E tests for review flow using Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Review Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a business page
    await page.goto('/business/test-business-123');
  });

  test('should create a new review', async ({ page }) => {
    // Click "Write a Review" button
    await page.click('text=Write a Review');

    // Fill in review form
    await page.fill('input[name="title"]', 'Great experience!');
    await page.fill('textarea[name="content"]', 'This place is amazing. Highly recommend!');
    
    // Select rating (click 5 stars)
    await page.click('[data-testid="star-5"]');
    
    // Select tags
    await page.click('text=friendly');
    await page.click('text=fast-service');

    // Submit review
    await page.click('button[type="submit"]');

    // Verify review appears on page
    await expect(page.locator('text=Great experience!')).toBeVisible();
  });

  test('should edit an existing review', async ({ page }) => {
    // Assume user has already created a review
    // Click edit button on review
    await page.click('[data-testid="edit-review-button"]');

    // Verify form is pre-filled
    await expect(page.locator('input[name="title"]')).toHaveValue('Great experience!');
    await expect(page.locator('textarea[name="content"]')).toContainText('This place is amazing');

    // Update review
    await page.fill('input[name="title"]', 'Updated: Great experience!');
    await page.fill('textarea[name="content"]', 'Updated content');

    // Submit update
    await page.click('button[type="submit"]');

    // Verify updated review appears
    await expect(page.locator('text=Updated: Great experience!')).toBeVisible();
  });

  test('should upload images with review', async ({ page }) => {
    await page.click('text=Write a Review');

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('__test-utils__/fixtures/test-image.jpg');

    // Verify image preview appears
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

    // Fill and submit review
    await page.fill('input[name="title"]', 'Review with images');
    await page.fill('textarea[name="content"]', 'Check out these photos!');
    await page.click('[data-testid="star-5"]');
    await page.click('button[type="submit"]');

    // Verify review with images appears
    await expect(page.locator('text=Review with images')).toBeVisible();
    await expect(page.locator('img[alt*="review"]')).toBeVisible();
  });

  test('should remove images when editing review', async ({ page }) => {
    // Navigate to edit review
    await page.goto('/business/test-business-123/review?edit=review-1');

    // Verify existing images are displayed
    const imageCount = await page.locator('[data-testid="existing-image"]').count();
    expect(imageCount).toBeGreaterThan(0);

    // Remove an image
    await page.click('[data-testid="remove-image-0"]');

    // Verify image is removed from preview
    const newImageCount = await page.locator('[data-testid="existing-image"]').count();
    expect(newImageCount).toBe(imageCount - 1);

    // Submit update
    await page.click('button[type="submit"]');

    // Verify updated review has fewer images
    // Implementation depends on actual UI
  });
});

