import { test, expect } from "@playwright/test";

/**
 * Admin disapproval workflow: business account creates business →
 * admin disapproves → business stays hidden and is not publicly visible.
 *
 * Requires env: E2E_BUSINESS_ACCOUNT_EMAIL, E2E_BUSINESS_ACCOUNT_PASSWORD,
 * E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD. Skips if not set.
 */
test.describe("Business disapproval flow", () => {
  const businessEmail = process.env.E2E_BUSINESS_ACCOUNT_EMAIL;
  const businessPassword = process.env.E2E_BUSINESS_ACCOUNT_PASSWORD;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;

  test.beforeEach(async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
    await page.goto(baseURL);
  });

  test("create business → admin disapprove → business not live; direct URL 404 or not available", async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);

    if (!businessEmail || !businessPassword || !adminEmail || !adminPassword) {
      test.skip(
        true,
        "E2E_BUSINESS_ACCOUNT_EMAIL, E2E_BUSINESS_ACCOUNT_PASSWORD, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD required"
      );
      return;
    }

    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
    const uniqueName = `E2E Disapprove ${Date.now()} Shop`;

    // --- 1. Log in as business account ---
    await page.goto(`${baseURL}/login`);
    await page.getByRole("textbox", { name: /email/i }).click();
    await page.getByRole("textbox", { name: /email/i }).pressSequentially(businessEmail, { delay: 30 });
    await page.getByRole("textbox", { name: /password/i }).click();
    await page.getByRole("textbox", { name: /password/i }).pressSequentially(businessPassword, { delay: 30 });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled({ timeout: 10000 });
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20000 }).catch(async () => {
      const err = await page.getByRole("alert").textContent().catch(() => "") || await page.locator("[class*='error']").first().textContent().catch(() => "");
      throw new Error(`Business login failed (still on /login). ${err || "Check E2E_BUSINESS_ACCOUNT_EMAIL and E2E_BUSINESS_ACCOUNT_PASSWORD."}`);
    });

    // --- 2. Create a new business ---
    await page.goto(`${baseURL}/add-business`);
    await expect(page).toHaveURL(/\/add-business/);

    await page.getByPlaceholder("Enter business name").fill(uniqueName);
    await page.getByPlaceholder("Select a main category").click();
    await page.getByText(/food|restaurant|shop|shopping/i).first().click();
    await page.getByPlaceholder(/Select a subcategory|Select main category first/i).click();
    await page.getByText(/shop|store|retail/i).first().click();
    await page.locator('input[name="location"]').fill("Cape Town");

    await page.getByRole("button", { name: /submit|create|add business|save|next/i }).click();

    await expect(
      page.getByText(/submitted for review|submitted for approval/i)
    ).toBeVisible({ timeout: 15000 });

    // --- 3. Log in as admin ---
    await page.goto(`${baseURL}/login`);
    await page.getByRole("textbox", { name: /email/i }).click();
    await page.getByRole("textbox", { name: /email/i }).pressSequentially(adminEmail, { delay: 30 });
    await page.getByRole("textbox", { name: /password/i }).click();
    await page.getByRole("textbox", { name: /password/i }).pressSequentially(adminPassword, { delay: 30 });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled({ timeout: 10000 });
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20000 }).catch(async () => {
      const err = await page.getByRole("alert").textContent().catch(() => "") || await page.locator("[class*='error']").first().textContent().catch(() => "");
      throw new Error(`Admin login failed (still on /login). ${err || "Check E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD."}`);
    });

    // --- 4. Admin: Pending list shows business; click Review to open review page ---
    await page.goto(`${baseURL}/admin/pending-businesses`);
    await expect(page).toHaveURL(/\/admin\/pending-businesses/);

    const row = page.locator("table tbody tr").filter({ hasText: uniqueName });
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.getByRole("link", { name: /review/i }).click();
    await expect(page).toHaveURL(/\/admin\/businesses\/[^/]+\/review/, { timeout: 5000 });

    // --- 4b. On review page, click Reject; modal appears with reason dropdown ---
    await page.getByRole("button", { name: /^reject$/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 3000 });
    await modal.locator("select").selectOption({ value: "duplicate" });
    await modal.getByRole("button", { name: /^reject$/i }).click();

    // Back to pending list; row removed (redirected away)
    await expect(page).toHaveURL(/\/admin\/pending-businesses/, { timeout: 8000 });

    // --- 5. Public list must not show this business ---
    const listRes = await request.get(`${baseURL}/api/businesses?limit=100`);
    expect(listRes.ok()).toBeTruthy();
    const listData = await listRes.json();
    const list = listData?.businesses ?? listData?.data ?? (Array.isArray(listData) ? listData : []);
    const names = (list as { name?: string }[]).map((b) => b.name || "");
    expect(names.some((n) => n.includes("E2E Disapprove"))).toBe(false);

    // --- 6. Direct detail URL: 404 or "not available" ---
    const slug = uniqueName.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    const detailApiRes = await request.get(`${baseURL}/api/businesses/${slug}`);
    expect(detailApiRes.status()).toBe(404);

    await page.goto(`${baseURL}/business/${slug}`);
    const notFound = await page.getByText(/not found|not available|doesn't exist|404/i).isVisible().catch(() => false);
    const is404 = page.url().includes("404") || (await page.title()).toLowerCase().includes("not found");
    expect(notFound || is404 || (await page.getByRole("heading", { name: /not found|error/i }).isVisible().catch(() => false))).toBeTruthy();
  });
});
