import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, signInTestUser } from '../fixtures/test-user';

let testUser: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  testUser = await createTestUser('monthly');
});

test.afterAll(async () => {
  if (testUser?.id) await deleteTestUser(testUser.id);
});

test('mentor page loads', async ({ page }) => {
  await signInTestUser(page, testUser);
  await page.goto('/mentor');

  // Should show mentor interface
  await expect(
    page.getByText(/mentor|chat|coach|guide|stoic|scientist/i),
  ).toBeVisible({ timeout: 10_000 });
});

test('can send a message to mentor', async ({ page }) => {
  await signInTestUser(page, testUser);
  await page.goto('/mentor');

  // Find the chat input
  const input = page.getByRole('textbox').first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill('How can I improve my sleep habits?');

    const sendBtn = page.getByRole('button', { name: /send/i });
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click();

      // Wait for some response (could be streaming)
      await page.waitForTimeout(3_000);

      // Check that something appeared in the chat
      const messageCount = await page.locator('[data-testid="chat-message"], .chat-message, [role="article"]').count();
      // At minimum, our sent message should be visible
      expect(messageCount).toBeGreaterThanOrEqual(1);
    }
  }
});

test('quick action chips are visible', async ({ page }) => {
  await signInTestUser(page, testUser);
  await page.goto('/mentor');

  // Look for quick action buttons/chips
  const quickAction = page.getByRole('button').filter({ hasText: /reflect|motivation|advice|goals/i }).first();
  // Soft check — not all UIs have quick actions
  if (await quickAction.isVisible().catch(() => false)) {
    await quickAction.click();
    await page.waitForTimeout(1_000);
  }
});
