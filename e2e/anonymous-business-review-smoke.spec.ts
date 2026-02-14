import { test, expect } from "@playwright/test";

/**
 * Smoke test: submit a business review as an unauthenticated (anonymous) user.
 * Ensures POST /api/reviews accepts anonymous submissions and returns success.
 */
test.describe("Anonymous business review smoke test", () => {
  test("unauthenticated user can submit a business review", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

    // 1. Ensure we're not logged in (use fresh context; no storage)
    await page.goto(baseURL);
    await page.goto(`${baseURL}/login`);
    await expect(page).toHaveURL(/\/login/);
    // Don't fill login form — we stay anonymous

    // 2. Fetch one active business to review (public API)
    const listRes = await request.get(
      `${baseURL}/api/businesses?limit=1`
    );
    if (!listRes.ok()) {
      test.skip(true, "Could not fetch businesses list (API not available or no businesses)");
      return;
    }
    const listData = await listRes.json();
    const businesses = listData?.businesses ?? listData?.data ?? listData;
    const list = Array.isArray(businesses) ? businesses : [];
    const business = list[0];
    if (!business?.id && !business?.slug) {
      test.skip(true, "No active business found to review");
      return;
    }
    const businessIdentifier = business.slug || business.id;

    // 3. Open the business review page (unauthenticated)
    await page.goto(`${baseURL}/business/${businessIdentifier}/review`);
    await expect(page).toHaveURL(new RegExp(`/business/${businessIdentifier}/review`));

    // Wait for the form to be visible (business loaded)
    await page.getByRole("heading", { name: /Write a Review/i }).waitFor({ state: "visible", timeout: 15000 });

    // 4. Select a rating (click 5 stars)
    const fiveStar = page.getByRole("button", { name: /Rate 5 stars/i });
    await fiveStar.click();

    // 5. Fill review content (min 10 chars)
    const contentPlaceholder = "Share your experience with others...";
    const reviewContent = "E2E anonymous smoke test. Great experience!";
    await page.getByPlaceholder(contentPlaceholder).fill(reviewContent);

    // 6. Submit (button enabled when rating + content valid)
    const submitBtn = page.getByRole("button", { name: /Submit Review/i });
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // 7. Expect success: toast or redirect to business page
    await Promise.race([
      page.getByText(/Review submitted successfully|created successfully/i).waitFor({ state: "visible", timeout: 15000 }),
      page.waitForURL(new RegExp(`/business/${businessIdentifier}(?:/)?(?:\\?|$)`), { timeout: 15000 }),
    ]).then(() => {});

    const url = page.url();
    const hasSuccessToast = await page.getByText(/Review submitted successfully|created successfully/i).isVisible().catch(() => false);
    const hasRedirectedToBusiness = /\/business\/[^/]+(?:\/?\?|$)/.test(url);

    expect(hasSuccessToast || hasRedirectedToBusiness).toBeTruthy();
  });
});
