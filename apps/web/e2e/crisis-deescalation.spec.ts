import { test, expect } from '@playwright/test';

/**
 * E2E tests for the crisis de-escalation safety flow.
 *
 * These tests verify that when a user sends a message containing crisis
 * language in the mentor chat, crisis resources are surfaced immediately.
 *
 * AUTH REQUIREMENT: These tests need an authenticated session.
 * TODO: Set up an auth helper that creates a test user session via Supabase,
 *       or use `storageState` from a global setup that logs in once.
 *
 * TEST DATA: Requires a configured user mentor (the onboarding flow creates
 *            one). A seeded test account with completed onboarding is ideal.
 *
 * NOTE: The test phrases below are intentionally crafted to match the
 * detection patterns in `packages/core/src/safety/crisis-detection.ts`
 * without containing graphic language. They use the medium-severity tier
 * to keep test fixtures as safe as possible while still exercising the flow.
 */

test.describe('Crisis De-escalation', () => {
  // TODO: Replace with real auth helper once available
  // test.use({ storageState: 'e2e/.auth/user.json' });

  test('displays crisis resources when crisis language is detected', async ({ page }) => {
    // Navigate to the mentor chat page
    await page.goto('/mentor');

    // Wait for the chat interface to load
    // The mentor page renders a chat input at the bottom
    const chatInput = page.getByRole('textbox');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    // Type a message that matches a MEDIUM-severity pattern from crisis-detection.ts
    // Using "no reason to live" which is a medium-tier pattern
    // This is a known detection phrase, not arbitrary crisis language
    await chatInput.fill('I feel like there is no reason to live anymore');
    await chatInput.press('Enter');

    // Verify crisis resources banner appears
    // The crisis response includes the Lifeline number and resource links
    // The exact UI may render as a banner, modal, or inline card
    await expect(
      page.getByText(/13 11 14/).or(page.getByText(/Lifeline/))
    ).toBeVisible({ timeout: 15_000 });

    // Verify Beyond Blue is also listed (secondary resource)
    await expect(
      page.getByText(/Beyond Blue/).or(page.getByText(/1300 22 4636/))
    ).toBeVisible();

    // Verify the crisis response message contains supportive language
    // from crisis-response.ts (medium tier message)
    await expect(
      page.getByText(/difficult time|support available/i)
    ).toBeVisible();
  });

  test('does not trigger crisis response for normal messages', async ({ page }) => {
    await page.goto('/mentor');

    const chatInput = page.getByRole('textbox');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    // Send a normal, non-crisis message
    await chatInput.fill('What are some good strategies for improving my sleep?');
    await chatInput.press('Enter');

    // Wait for the assistant response to appear
    // We look for any assistant message bubble to confirm the response loaded
    await expect(
      page.locator('[data-role="assistant"], .chat-bubble-assistant').first()
    ).toBeVisible({ timeout: 15_000 });

    // Verify NO crisis resources banner appeared
    await expect(page.getByText('13 11 14')).not.toBeVisible();
    await expect(page.getByText('Lifeline')).not.toBeVisible();
  });

  test('crisis resources are still shown for high-severity patterns', async ({ page }) => {
    // This test uses a high-severity pattern to verify the strongest detection tier.
    // The phrase "end it all" is in the HIGH_PATTERNS list.
    await page.goto('/mentor');

    const chatInput = page.getByRole('textbox');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    await chatInput.fill('I want to end it all');
    await chatInput.press('Enter');

    // High-severity should show resources AND a stronger support message
    await expect(
      page.getByText(/13 11 14/).or(page.getByText(/Lifeline/))
    ).toBeVisible({ timeout: 15_000 });

    // High-tier message from crisis-response.ts
    await expect(
      page.getByText(/don't have to go through this alone|ready to help/i)
    ).toBeVisible();
  });
});
