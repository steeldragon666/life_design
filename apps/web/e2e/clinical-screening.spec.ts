import { test, expect } from '@playwright/test';

/**
 * E2E tests for the clinical screening flow (PHQ-9 / GAD-7).
 *
 * The screening form lives at:
 *   `apps/web/src/components/screening/clinical-screening-form.tsx`
 *
 * It renders 9 questions (PHQ-9) or 7 questions (GAD-7) with 4 radio options
 * each (0-3 Likert scale). On submit it calculates a score and severity.
 *
 * AUTH REQUIREMENT: Same as other E2E tests -- needs authenticated session.
 * TODO: Set up auth helper (storageState from global setup).
 *
 * NAVIGATION: The screening form may be accessed from the settings page or
 * via a direct route. If there is no dedicated /screening route, these tests
 * should be updated to navigate via the settings UI. Currently we attempt
 * /settings and look for a screening trigger there.
 */

test.describe('Clinical Screening', () => {
  // TODO: Replace with real auth helper
  // test.use({ storageState: 'e2e/.auth/user.json' });

  test('completes PHQ-9 screening with all "Not at all" and shows minimal severity', async ({
    page,
  }) => {
    // Navigate to settings where clinical screening may be accessible
    // TODO: Update route if screening gets its own page
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Look for a screening trigger -- could be a button or link
    const screeningTrigger = page
      .getByRole('button', { name: /screening|PHQ|assessment/i })
      .or(page.getByRole('link', { name: /screening|PHQ|assessment/i }));

    // If a trigger exists, click it; otherwise try direct navigation
    if (await screeningTrigger.isVisible().catch(() => false)) {
      await screeningTrigger.click();
    } else {
      // Fallback: the screening form might be rendered inline or at a sub-route
      // TODO: Adjust if the form appears in a different location
    }

    // Wait for the screening form to appear
    // The form contains fieldsets with role="radiogroup" for each question
    const firstQuestion = page.getByRole('radiogroup').first();
    await expect(firstQuestion).toBeVisible({ timeout: 10_000 });

    // Answer all 9 PHQ-9 questions with "Not at all" (value = 0)
    // Each question is a fieldset containing radio buttons
    const radioGroups = page.getByRole('radiogroup');
    const count = await radioGroups.count();

    for (let i = 0; i < count; i++) {
      const group = radioGroups.nth(i);
      // Click the "Not at all" option within this group
      const notAtAll = group.getByRole('radio', { name: /Not at all/i });
      await notAtAll.click();
    }

    // Submit the screening
    const submitButton = page.getByRole('button', { name: /submit/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Verify the score is displayed (should be 0 for all "Not at all")
    await expect(page.getByText(/score/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/\b0\b/)).toBeVisible();

    // Verify severity label shows "minimal" (PHQ-9 score 0 = minimal depression)
    await expect(page.getByText(/minimal/i)).toBeVisible();
  });

  test('critical flag triggers when PHQ-9 item 9 receives non-zero response', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Try to reach the screening form (same navigation as above)
    const screeningTrigger = page
      .getByRole('button', { name: /screening|PHQ|assessment/i })
      .or(page.getByRole('link', { name: /screening|PHQ|assessment/i }));

    if (await screeningTrigger.isVisible().catch(() => false)) {
      await screeningTrigger.click();
    }

    const radioGroups = page.getByRole('radiogroup');
    await expect(radioGroups.first()).toBeVisible({ timeout: 10_000 });

    const count = await radioGroups.count();

    // Answer all questions with "Not at all" except item 9 (last PHQ-9 item)
    for (let i = 0; i < count; i++) {
      const group = radioGroups.nth(i);
      if (i === 8) {
        // Item 9 (index 8): Select "Several days" (value = 1) to trigger critical flag
        // This is the suicidal ideation question -- any non-zero value triggers safety
        const severalDays = group.getByRole('radio', { name: /Several days/i });
        await severalDays.click();
      } else {
        const notAtAll = group.getByRole('radio', { name: /Not at all/i });
        await notAtAll.click();
      }
    }

    // After selecting a non-zero value for item 9, a critical flag / warning
    // should appear immediately (before submission), as the component calls
    // onCriticalFlag() in the handleChange callback
    await expect(
      page
        .getByText(/crisis|safety|critical|immediate support|help/i)
        .or(page.getByText(/13 11 14/))
        .or(page.getByText(/Lifeline/))
    ).toBeVisible({ timeout: 5_000 });
  });

  test('submitting PHQ-9 with moderate scores shows appropriate severity', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const screeningTrigger = page
      .getByRole('button', { name: /screening|PHQ|assessment/i })
      .or(page.getByRole('link', { name: /screening|PHQ|assessment/i }));

    if (await screeningTrigger.isVisible().catch(() => false)) {
      await screeningTrigger.click();
    }

    const radioGroups = page.getByRole('radiogroup');
    await expect(radioGroups.first()).toBeVisible({ timeout: 10_000 });

    const count = await radioGroups.count();

    // Select "More than half the days" (value = 2) for each question
    // Total score = 18 for PHQ-9, which is "moderately severe"
    for (let i = 0; i < count; i++) {
      const group = radioGroups.nth(i);
      const option = group.getByRole('radio', { name: /More than half the days/i });
      await option.click();
    }

    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Score of 18 should show "moderately severe" severity
    await expect(page.getByText(/score/i)).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText(/moderately severe|severe/i)
    ).toBeVisible();
  });
});
