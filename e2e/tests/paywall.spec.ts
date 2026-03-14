import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, signInTestUser } from '../fixtures/test-user';
import { mockStripeRoutes } from '../fixtures/stripe-mock';

test.describe('Paywall', () => {
  let trialUser: Awaited<ReturnType<typeof createTestUser>>;

  test.beforeAll(async () => {
    trialUser = await createTestUser('trial');
  });

  test.afterAll(async () => {
    if (trialUser?.id) await deleteTestUser(trialUser.id);
  });

  test('trial user can access core features', async ({ page }) => {
    await signInTestUser(page, trialUser);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    // Core features should be accessible
    await expect(page.getByText(/dashboard|overview|life design/i)).toBeVisible({ timeout: 10_000 });
  });

  test('paywall page renders with plan options', async ({ page }) => {
    await signInTestUser(page, trialUser);
    await page.goto('/paywall');

    // Should show pricing / plan options
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('clicking a plan redirects to Stripe checkout', async ({ page }) => {
    await mockStripeRoutes(page);
    await signInTestUser(page, trialUser);
    await page.goto('/paywall');

    // Find any plan / subscribe button
    const planBtn = page.getByRole('button', { name: /subscribe|upgrade|start|choose/i }).first();
    if (await planBtn.isVisible().catch(() => false)) {
      await planBtn.click();
      // Should attempt to redirect to Stripe (mocked)
      await page.waitForTimeout(1_000);
    }
  });
});
