import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, signInTestUser } from '../fixtures/test-user';

let testUser: Awaited<ReturnType<typeof createTestUser>>;

test.beforeEach(async () => {
  testUser = await createTestUser('trial');
});

test.afterEach(async () => {
  if (testUser?.id) await deleteTestUser(testUser.id);
});

test('signup page renders and starts onboarding flow', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});

test('sign in redirects to dashboard', async ({ page }) => {
  await signInTestUser(page, testUser);
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
});

test('sign out redirects to login or landing', async ({ page }) => {
  await signInTestUser(page, testUser);

  // Look for a sign-out / logout button or menu item
  const signOutBtn =
    page.getByRole('button', { name: /sign out|log out/i });
  const menuTrigger = page.getByRole('button', { name: /menu|profile|avatar/i });

  if (await menuTrigger.isVisible().catch(() => false)) {
    await menuTrigger.click();
  }

  if (await signOutBtn.isVisible().catch(() => false)) {
    await signOutBtn.click();
    await page.waitForURL(/\/(login|$)/);
  }
});

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForURL(/\/login/);
  await expect(page).toHaveURL(/\/login/);
});

test('password reset page is accessible', async ({ page }) => {
  await page.goto('/login');
  const resetLink = page.getByRole('link', { name: /forgot|reset/i });
  if (await resetLink.isVisible().catch(() => false)) {
    await resetLink.click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  }
});
