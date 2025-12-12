/**
 * E2E tests for business owner review response functionality
 * 
 * IMPORTANT SETUP REQUIREMENTS:
 * 1. Create authenticated user state: npx playwright codegen --save-storage=playwright/.auth/owner.json http://localhost:3000/login
 * 2. Log in as a business owner who has claimed a business
 * 3. Ensure the business has at least one review to respond to
 * 
 * Tests the complete owner journey:
 * 1. Owner views their business reviews
 * 2. Owner writes a reply to a review
 * 3. Owner edits their reply
 * 4. Owner deletes their reply
 */

import { test, expect } from '@playwright/test';

// Use authenticated state for faster, more reliable tests
// To create: npx playwright codegen --save-storage=playwright/.auth/owner.json http://localhost:3000/login
// Then log in as a business owner and close the browser when done.
test.use({ 
  storageState: process.env.PLAYWRIGHT_OWNER_AUTH_STATE || 'playwright/.auth/owner.json' 
});

test.describe('Business Owner Review Response', () => {
  const TEST_BUSINESS_ID = 'test-business-with-reviews';
  const TEST_BUSINESS_SLUG = 'test-business';
  const TEST_REVIEW_ID = 'review-123';
  
  test.beforeEach(async ({ page }) => {
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
        url.includes('supabase.co/realtime') ||
        (url.includes('supabase.co/rest/v1') && url.includes('realtime'))
      ) {
        return route.abort();
      }
      return route.continue();
    });
    
    // Mock API responses for review replies
    await page.route(/.*\/api\/reviews\/.*\/replies.*/, async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            replies: [],
          }),
        });
      } else if (method === 'POST') {
        const body = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reply: {
              id: 'reply-new',
              content: body.content,
              user_id: 'owner-123',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          }),
        });
      }
    });
    
    // Mock reviews API
    await page.route(/.*\/api\/reviews\?business_id=.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviews: [
            {
              id: TEST_REVIEW_ID,
              business_id: TEST_BUSINESS_ID,
              user_id: 'customer-456',
              rating: 4,
              title: 'Great experience!',
              content: 'This place is amazing. Highly recommend!',
              tags: ['friendly', 'fast-service'],
              helpful_count: 5,
              created_at: new Date().toISOString(),
              user: {
                id: 'customer-456',
                name: 'John Doe',
              },
            },
          ],
        }),
      });
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

  test('should allow owner to write a reply to a review', async ({ page }) => {
    test.setTimeout(60000);
    
    // Navigate to business page (owner view)
    await page.goto(`/business/${TEST_BUSINESS_SLUG}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to be ready
    await expect(page.getByText(/reviews/i).first()).toBeVisible({ timeout: 10000 });
    
    // Wait for review to appear
    await expect(page.getByText('Great experience!')).toBeVisible({ timeout: 10000 });
    
    // Find and click "Write a Reply" button (should be visible for owners)
    const replyButton = page.getByRole('button', { name: /write a reply/i }).first();
    await expect(replyButton).toBeVisible({ timeout: 5000 });
    await replyButton.scrollIntoViewIfNeeded();
    await replyButton.click();
    
    // Wait for reply form to appear
    await expect(page.getByPlaceholderText(/write a public reply/i)).toBeVisible({ timeout: 5000 });
    
    // Fill in reply
    const replyTextarea = page.getByPlaceholderText(/write a public reply/i);
    await replyTextarea.fill('Thank you for your review! We appreciate your feedback.');
    
    // Submit reply
    const submitButton = page.getByRole('button', { name: /save reply/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    // Wait for reply to appear (or form to close)
    await expect(
      page.getByText(/thank you for your review/i)
    ).toBeVisible({ timeout: 5000 }).catch(async () => {
      // If reply doesn't appear immediately, form should close
      await expect(page.getByPlaceholderText(/write a public reply/i)).not.toBeVisible({ timeout: 5000 });
    });
  });

  test('should allow owner to edit their reply', async ({ page }) => {
    test.setTimeout(60000);
    
    // Mock existing reply
    await page.route(/.*\/api\/reviews\/.*\/replies.*/, async (route) => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            replies: [
              {
                id: 'reply-123',
                content: 'Original reply text',
                user_id: 'owner-123',
                created_at: new Date().toISOString(),
                user: {
                  id: 'owner-123',
                  name: 'Business Owner',
                },
              },
            ],
          }),
        });
      } else if (method === 'PUT') {
        const body = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reply: {
              id: body.replyId,
              content: body.content,
              user_id: 'owner-123',
              updated_at: new Date().toISOString(),
            },
          }),
        });
      }
    });
    
    // Navigate to business page
    await page.goto(`/business/${TEST_BUSINESS_SLUG}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for review and existing reply to appear
    await expect(page.getByText('Great experience!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Original reply text')).toBeVisible({ timeout: 10000 });
    
    // Click edit button on reply
    const editButton = page.getByLabelText(/edit reply/i).first();
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.scrollIntoViewIfNeeded();
    await editButton.click();
    
    // Wait for edit form
    await expect(page.getByDisplayValue('Original reply text')).toBeVisible({ timeout: 5000 });
    
    // Update reply text
    const editTextarea = page.getByDisplayValue('Original reply text');
    await editTextarea.clear();
    await editTextarea.fill('Updated reply text');
    
    // Save changes
    const saveButton = page.getByRole('button', { name: /^save$/i }).first();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    
    // Wait for updated text to appear
    await expect(page.getByText('Updated reply text')).toBeVisible({ timeout: 5000 });
  });

  test('should allow owner to delete their reply', async ({ page }) => {
    test.setTimeout(60000);
    
    let deleteCalled = false;
    
    // Mock existing reply
    await page.route(/.*\/api\/reviews\/.*\/replies.*/, async (route) => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            replies: deleteCalled ? [] : [
              {
                id: 'reply-123',
                content: 'Reply to delete',
                user_id: 'owner-123',
                created_at: new Date().toISOString(),
                user: {
                  id: 'owner-123',
                  name: 'Business Owner',
                },
              },
            ],
          }),
        });
      } else if (method === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });
    
    // Navigate to business page
    await page.goto(`/business/${TEST_BUSINESS_SLUG}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for review and reply to appear
    await expect(page.getByText('Great experience!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Reply to delete')).toBeVisible({ timeout: 10000 });
    
    // Click delete button
    const deleteButton = page.getByLabelText(/delete reply/i).first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.click();
    
    // Confirm deletion in dialog
    await expect(page.getByText(/are you sure you want to delete this reply/i)).toBeVisible({ timeout: 5000 });
    
    const confirmButton = page.getByRole('button', { name: /confirm|delete/i }).first();
    await confirmButton.click();
    
    // Wait for reply to disappear
    await expect(page.getByText('Reply to delete')).not.toBeVisible({ timeout: 5000 });
  });

  test('should disable submit button when reply text is empty', async ({ page }) => {
    test.setTimeout(60000);
    
    // Navigate to business page
    await page.goto(`/business/${TEST_BUSINESS_SLUG}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for review
    await expect(page.getByText('Great experience!')).toBeVisible({ timeout: 10000 });
    
    // Open reply form
    const replyButton = page.getByRole('button', { name: /write a reply/i }).first();
    await replyButton.click();
    
    // Verify submit button is disabled
    const submitButton = page.getByRole('button', { name: /save reply/i });
    await expect(submitButton).toBeDisabled();
    
    // Type text - button should enable
    const textarea = page.getByPlaceholderText(/write a public reply/i);
    await textarea.fill('Test reply');
    
    await expect(submitButton).toBeEnabled();
    
    // Clear text - button should disable
    await textarea.clear();
    await expect(submitButton).toBeDisabled();
  });

  test('should show "Message Customer" button for owners', async ({ page }) => {
    test.setTimeout(60000);
    
    // Navigate to business page
    await page.goto(`/business/${TEST_BUSINESS_SLUG}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for review
    await expect(page.getByText('Great experience!')).toBeVisible({ timeout: 10000 });
    
    // Verify "Message Customer" button is visible for owners
    const messageButton = page.getByRole('button', { name: /message customer/i }).first();
    await expect(messageButton).toBeVisible({ timeout: 5000 });
  });
});

