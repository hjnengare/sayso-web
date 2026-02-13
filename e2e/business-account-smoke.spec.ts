import { test, expect } from "@playwright/test";

const BUSINESS_EMAIL = "hnengare@gmail.com";
const BUSINESS_PASSWORD = "enviolata79";
const BUSINESS_USERNAME = "hnengare_biz";

// Note: After signup, the app requires email verification before login/my-businesses.
// For this test to reach Add Business, either use an already-verified account (same credentials, log in)
// or run in an environment where email confirmation is disabled (e.g. Supabase auth config).

test.describe("Business Account E2E smoke test", () => {
  test("full flow: signup (or login) → my-businesses → add business → verify listing", async ({
    page,
  }) => {
    test.setTimeout(90000);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error") {
        const text = msg.text();
        consoleErrors.push(text);
      }
    });

    // 1. Sign up as business account (credentials are for signup); if already registered, log in
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    await page.getByRole("button", { name: /Business Account/i }).click();
    await page.getByRole("button", { name: /^Register$/i }).click();

    await page.getByPlaceholder(/Choose a username/i).fill(BUSINESS_USERNAME);
    await page.getByPlaceholder(/business@company\.com|you@example\.com/i).fill(BUSINESS_EMAIL);
    await page.getByPlaceholder(/Create a password|Enter your password/i).fill(BUSINESS_PASSWORD);
    await page.getByRole("checkbox", { name: /Terms of Use|Privacy Policy|I agree/i }).check();

    await page.getByRole("button", { name: /Create business account/i }).click();

    // Wait for either success toast, "already exists" (with Switch to Login), or redirect to my-businesses
    const switchToLogin = page.getByRole("button", { name: /Switch to Login/i });
    const myBusinessesUrl = page.waitForURL(/\/my-businesses/, { timeout: 5000 }).catch(() => null);
    await Promise.race([
      switchToLogin.waitFor({ state: "visible", timeout: 8000 }),
      page.getByText(/account created|Check your email/i).waitFor({ state: "visible", timeout: 8000 }),
      myBusinessesUrl,
    ]);
    if (await page.url().includes("/my-businesses")) {
      // Already redirected (e.g. auto-confirmed)
    } else if (await switchToLogin.isVisible().catch(() => false)) {
      // Account exists: click "Switch to Login" to dismiss overlay, then sign in
      await switchToLogin.click();
      await page.getByPlaceholder(/business@company\.com|you@example\.com/i).fill(BUSINESS_EMAIL);
      await page.getByPlaceholder(/Enter your password|Create a password/i).fill(BUSINESS_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();
    } else if (await page.getByText(/account created|Check your email/i).isVisible().catch(() => false)) {
      // Just registered: try logging in (in case email is auto-confirmed in test env)
      await page.getByRole("button", { name: /^Login$/i }).click();
      await page.getByPlaceholder(/business@company\.com|you@example\.com/i).fill(BUSINESS_EMAIL);
      await page.getByPlaceholder(/Enter your password|Create a password/i).fill(BUSINESS_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();
    }
    // If we didn't redirect yet, expect below will wait for /my-businesses (or fail with clear message)

    // 2. Confirm redirect to /my-businesses
    await expect(page).toHaveURL(/\/my-businesses/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /My Businesses|No businesses yet/i }).or(page.getByRole("button", { name: /Add your business/i }))
    ).toBeVisible({ timeout: 12000 });

    // 3. Create dummy E2E test business via API (logged-in business_owner session)
    // Name: E2E Test Business, category: restaurants, address: 9 garnet road lansdowne cape town
    const E2E_BUSINESS_NAME = "E2E Test Business";
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

    const createRes = await page.request.post(`${baseURL}/api/businesses`, {
      multipart: {
        name: E2E_BUSINESS_NAME,
        mainCategory: "food-drink",
        category: "restaurants",
        subcategory: "restaurants",
        businessType: "physical",
        location: "9 garnet road lansdowne cape town",
        priceRange: "$$",
      },
      timeout: 15000,
    });
    const createText = await createRes.text();
    if (!createRes.ok()) {
      throw new Error(`Create business failed (${createRes.status()}): ${createText}`);
    }
    const createJson = JSON.parse(createText) as { business?: { id: string }; error?: string };
    if (createJson.error) throw new Error(`API error: ${createJson.error}`);
    expect(createJson.business?.id).toBeDefined();

    // 4. Assert business appears on /my-businesses (verifies DB insert + RLS, no validation errors)
    await page.goto("/my-businesses");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(E2E_BUSINESS_NAME)).toBeVisible({ timeout: 20000 });

    // 8. No critical console errors (no validation/RLS errors in console)
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("Download the React DevTools") &&
        !e.includes("Warning:") &&
        !e.includes("ResizeObserver")
    );
    expect(criticalErrors).toEqual([]);

    // 9. Optional cleanup: delete dummy business to keep database clean
    const businessId = createJson.business?.id;
    if (businessId) {
      const deleteRes = await page.request.delete(`${baseURL}/api/businesses/${businessId}`);
      if (deleteRes.ok()) {
        await page.reload();
        await expect(page.getByText(E2E_BUSINESS_NAME)).not.toBeVisible({ timeout: 5000 });
      }
    }
  });
});
