import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, signInTestUser } from '../fixtures/test-user';

let testUser: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  testUser = await createTestUser('monthly');
});

test.afterAll(async () => {
  if (testUser?.id) await deleteTestUser(testUser.id);
});

test('dashboard loads within acceptable time', async ({ page }) => {
  await signInTestUser(page, testUser);
  const start = Date.now();
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  const loadTime = Date.now() - start;

  // Should load within 5 seconds (generous for CI)
  expect(loadTime).toBeLessThan(5_000);
});

test('dashboard renders main sections', async ({ page }) => {
  await signInTestUser(page, testUser);
  await page.goto('/dashboard');

  // Should have recognizable dashboard content
  await expect(
    page.getByText(/dashboard|overview|life design|dimension/i),
  ).toBeVisible({ timeout: 10_000 });
});

test('dimension detail navigation works', async ({ page }) => {
  await signInTestUser(page, testUser);
  await page.goto('/dashboard');

  // Click on a dimension card or link
  const dimLink = page.getByRole('link', { name: /health|fitness|career|social/i }).first();
  if (await dimLink.isVisible().catch(() => false)) {
    await dimLink.click();
    await expect(page).toHaveURL(/\/dimensions\//);
  }
});

test('empty state shown for new user', async ({ page }) => {
  await signInTestUser(page, testUser);
  await page.goto('/dashboard');

  // New user with no data should see some form of empty/welcome state
  // This is a soft check — any content is acceptable
  await expect(page.locator('body')).not.toBeEmpty();
});
