import { test, expect, type Page } from '@playwright/test';

const USER_EMAIL = process.env.E2E_DM_USER_EMAIL || '';
const USER_PASSWORD = process.env.E2E_DM_USER_PASSWORD || '';
const BUSINESS_EMAIL = process.env.E2E_DM_BUSINESS_EMAIL || '';
const BUSINESS_PASSWORD = process.env.E2E_DM_BUSINESS_PASSWORD || '';
const BUSINESS_ID = process.env.E2E_DM_BUSINESS_ID || '';

async function login(page: Page, options: { email: string; password: string; business?: boolean }) {
  await page.goto('/login');

  if (options.business) {
    const businessToggle = page.getByRole('button', { name: /Business Account/i });
    if (await businessToggle.isVisible().catch(() => false)) {
      await businessToggle.click();
    }
  }

  await page.getByRole('textbox', { name: /email/i }).fill(options.email);
  await page.getByRole('textbox', { name: /password/i }).fill(options.password);
  await page.getByRole('button', { name: /^Sign in$/i }).click();

  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30_000 });
}

test.describe('Messaging flows', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'Messaging E2E currently validated on desktop viewports.');
    }

    if (!USER_EMAIL || !USER_PASSWORD || !BUSINESS_EMAIL || !BUSINESS_PASSWORD || !BUSINESS_ID) {
      test.skip(
        true,
        'Set E2E_DM_USER_EMAIL, E2E_DM_USER_PASSWORD, E2E_DM_BUSINESS_EMAIL, E2E_DM_BUSINESS_PASSWORD and E2E_DM_BUSINESS_ID.'
      );
    }
  });

  test('user starts chat with business and sends message', async ({ page }) => {
    await login(page, {
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });

    await page.goto(`/dm?business_id=${BUSINESS_ID}`);

    const composer = page.getByPlaceholder('Type a message...').first();
    await expect(composer).toBeVisible({ timeout: 20_000 });

    const messageText = `E2E user message ${Date.now()}`;
    await composer.fill(messageText);
    await page.getByRole('button', { name: /Send message/i }).first().click();

    await expect(page.getByText(messageText).last()).toBeVisible({ timeout: 15_000 });

    const conversationsResponse = await page.request.get('/api/conversations?role=user');
    expect(conversationsResponse.ok()).toBeTruthy();

    const conversationsPayload = await conversationsResponse.json();
    const conversation = (conversationsPayload?.data || []).find((item: any) => item.business_id === BUSINESS_ID);
    expect(conversation?.id).toBeTruthy();

    const messagesResponse = await page.request.get(`/api/conversations/${conversation.id}/messages?limit=20`);
    expect(messagesResponse.ok()).toBeTruthy();

    const messagesPayload = await messagesResponse.json();
    const hasMessage = (messagesPayload?.data?.messages || []).some((item: any) => item.body === messageText);
    expect(hasMessage).toBeTruthy();
  });

  test('business replies and user receives message in realtime', async ({ browser }) => {
    const userContext = await browser.newContext();
    const businessContext = await browser.newContext();

    const userPage = await userContext.newPage();
    const businessPage = await businessContext.newPage();

    try {
      await login(userPage, {
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });

      const createConversationResponse = await userPage.request.post('/api/conversations', {
        data: {
          business_id: BUSINESS_ID,
        },
      });
      expect(createConversationResponse.ok()).toBeTruthy();
      const createConversationPayload = await createConversationResponse.json();
      const conversationId = createConversationPayload?.data?.id;
      expect(conversationId).toBeTruthy();

      await userPage.goto(`/dm?conversation=${conversationId}`);
      await expect(userPage.getByPlaceholder('Type a message...').first()).toBeVisible({ timeout: 20_000 });

      await login(businessPage, {
        email: BUSINESS_EMAIL,
        password: BUSINESS_PASSWORD,
        business: true,
      });

      await businessPage.goto(`/my-businesses/messages?business_id=${BUSINESS_ID}&conversation=${conversationId}`);

      const businessComposer = businessPage.getByPlaceholder('Type a message...').first();
      await expect(businessComposer).toBeVisible({ timeout: 20_000 });

      const replyText = `E2E business reply ${Date.now()}`;
      await businessComposer.fill(replyText);
      await businessPage.getByRole('button', { name: /Send message/i }).first().click();

      await expect(userPage.getByText(replyText).last()).toBeVisible({ timeout: 15_000 });
    } finally {
      await businessContext.close();
      await userContext.close();
    }
  });
});
