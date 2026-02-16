import { test, expect } from "@playwright/test";

/**
 * Admin approval workflow: business account creates business → pending →
 * admin approves → business becomes live and publicly visible.
 *
 * Requires env: E2E_BUSINESS_ACCOUNT_EMAIL, E2E_BUSINESS_ACCOUNT_PASSWORD,
 * E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD. Skips if not set.
 */
test.describe("Business approval flow", () => {
  const businessEmail = process.env.E2E_BUSINESS_ACCOUNT_EMAIL;
  const businessPassword = process.env.E2E_BUSINESS_ACCOUNT_PASSWORD;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;

  test.beforeEach(async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
    await page.goto(baseURL);
  });

  test("create business → pending → admin approve → business is live and visible", async ({
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
    const uniqueName = `E2E Approval ${Date.now()} Cafe`;

    // --- 1. Log in as business account ---
    await page.goto(`${baseURL}/login`);
    const emailInput = page.getByRole("textbox", { name: /email/i });
    await emailInput.click();
    await emailInput.pressSequentially(businessEmail, { delay: 30 });
    const passwordInput = page.getByRole("textbox", { name: /password/i });
    await passwordInput.click();
    await passwordInput.pressSequentially(businessPassword, { delay: 30 });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled({ timeout: 10000 });
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20000 }).catch(async () => {
      const err = await page.getByRole("alert").textContent().catch(() => "") || await page.locator("[class*='error']").first().textContent().catch(() => "");
      throw new Error(`Business login failed (still on /login). ${err || "Check E2E_BUSINESS_ACCOUNT_EMAIL and E2E_BUSINESS_ACCOUNT_PASSWORD."}`);
    });

    // --- 2. Create a new business (minimal: name, category, location) ---
    await page.goto(`${baseURL}/add-business`);
    await expect(page).toHaveURL(/\/add-business/);

    await page.getByPlaceholder("Enter business name").fill(uniqueName);
    await page.getByPlaceholder("Select a main category").click();
    await page.getByText(/food|restaurant|cafe|drink/i).first().click();
    await page.getByPlaceholder(/Select a subcategory|Select main category first/i).click();
    await page.getByText(/cafe|cafes/i).first().click();
    await page.locator('input[name="location"]').fill("Cape Town");

    await page.getByRole("button", { name: /submit|create|add business|save|next/i }).click();

    // --- 3. After upload: UI shows "Submitted for approval" / "submitted for review" ---
    await expect(
      page.getByText(/submitted for review|submitted for approval|submitted for approval/i)
    ).toBeVisible({ timeout: 15000 });

    // --- 4. Business must NOT appear in public list (status = pending_approval) ---
    const listRes = await request.get(`${baseURL}/api/businesses?limit=50`);
    expect(listRes.ok()).toBeTruthy();
    const listData = await listRes.json();
    const list = listData?.businesses ?? listData?.data ?? (Array.isArray(listData) ? listData : []);
    const names = (list as { name?: string }[]).map((b) => b.name || "");
    expect(names.some((n) => n.includes(uniqueName))).toBe(false);

    // --- 5. Log out (or new context) and log in as admin ---
    await page.goto(`${baseURL}/admin`);
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

    // --- 6. Admin dashboard: open Pending Approvals ---
    await page.goto(`${baseURL}/admin/pending-businesses`);
    await expect(page).toHaveURL(/\/admin\/pending-businesses/);

    await expect(page.getByRole("heading", { name: /pending businesses/i })).toBeVisible({
      timeout: 10000,
    });

    // --- 7. Pending list contains our business; click Review to open review page ---
    const row = page.locator("table tbody tr").filter({ hasText: uniqueName });
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.getByRole("link", { name: /review/i }).click();
    await expect(page).toHaveURL(/\/admin\/businesses\/[^/]+\/review/, { timeout: 5000 });

    // --- 7b. On review page, click Approve ---
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page).toHaveURL(/\/admin\/pending-businesses/, { timeout: 8000 }).catch(() => {});

    // --- 8. Public: business appears in list and detail page loads ---
    const listRes2 = await request.get(`${baseURL}/api/businesses?limit=100`);
    expect(listRes2.ok()).toBeTruthy();
    const listData2 = await listRes2.json();
    const list2 = listData2?.businesses ?? listData2?.data ?? (Array.isArray(listData2) ? listData2 : []);
    const names2 = (list2 as { name?: string; slug?: string }[]).map((b) => b.name || "");
    const found = (list2 as { name?: string; slug?: string }[]).find((b) =>
      (b.name || "").includes("E2E Approval")
    );
    expect(found).toBeDefined();

    const slug = found!.slug || found!.name?.toLowerCase().replace(/\s+/g, "-") || "";
    const detailRes = await request.get(`${baseURL}/api/businesses/${slug}`);
    expect(detailRes.ok()).toBe(true);

    await page.goto(`${baseURL}/business/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/business/${slug}`));
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
  });
});
