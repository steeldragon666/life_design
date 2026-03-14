import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, signInTestUser } from '../fixtures/test-user';

let testUser: Awaited<ReturnType<typeof createTestUser>>;

test.beforeAll(async () => {
  testUser = await createTestUser('trial');
});

test.afterAll(async () => {
  if (testUser?.id) await deleteTestUser(testUser.id);
});

test('complete onboarding flow', async ({ page }) => {
  await signInTestUser(page, testUser);

  // If redirected to onboarding, walk through steps
  if (page.url().includes('onboarding')) {
    // Step 1: Welcome
    await expect(page.getByText(/welcome|get started|life design/i)).toBeVisible();
    const nextBtn = page.getByRole('button', { name: /next|continue|get started/i });
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
    }

    // Step 2: Dimensions — select at least one
    const dimensionCheckbox = page.getByRole('checkbox').first();
    if (await dimensionCheckbox.isVisible().catch(() => false)) {
      await dimensionCheckbox.check();
      await page.getByRole('button', { name: /next|continue/i }).click();
    }

    // Step 3: Snapshot — rate dimensions
    const slider = page.getByRole('slider').first();
    if (await slider.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /next|continue/i }).click();
    }

    // Step 4: Connectors (optional)
    const skipBtn = page.getByRole('button', { name: /skip|later|next|continue/i });
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
    }

    // Step 5: Summary / finish
    const finishBtn = page.getByRole('button', { name: /finish|complete|start|done/i });
    if (await finishBtn.isVisible().catch(() => false)) {
      await finishBtn.click();
    }

    // Should end up on dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  }

  await expect(page).toHaveURL(/\/dashboard/);
});
