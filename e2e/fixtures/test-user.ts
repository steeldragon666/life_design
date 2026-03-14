import type { Page } from '@playwright/test';

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_KEY ?? '';

interface TestUser {
  id: string;
  email: string;
  password: string;
}

type SubscriptionState = 'trial' | 'monthly' | 'annual' | 'lifetime' | 'churned';

export async function createTestUser(
  state: SubscriptionState = 'trial',
): Promise<TestUser> {
  const suffix = Math.random().toString(36).slice(2, 8);
  const email = `e2e-${state}-${suffix}@test.lifedesign.app`;
  const password = `Test!${suffix}2024`;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { e2e: true, subscription_state: state },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create test user: ${res.status} ${await res.text()}`);
  }

  const user = await res.json();
  return { id: user.id, email, password };
}

export async function signInTestUser(
  page: Page,
  user: TestUser,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/);
}

export async function deleteTestUser(userId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
  });
}
