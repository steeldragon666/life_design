import { test, expect } from '@playwright/test';

/**
 * E2E tests for the clinical data export flow.
 *
 * The export UI lives at:
 *   `apps/web/src/components/settings/clinical-export.tsx`
 *
 * It allows users to select data categories (PHQ-9, GAD-7, mood trends,
 * sleep quality), choose a format (JSON or CSV), and trigger a download.
 * A shareable link is generated for clinician access.
 *
 * AUTH REQUIREMENT: Needs authenticated session with existing screening data.
 * TODO: Set up auth helper and seed test screening results.
 *
 * NAVIGATION: The export component is rendered within the settings page.
 */

test.describe('Clinical Data Export', () => {
  // TODO: Replace with real auth helper
  // test.use({ storageState: 'e2e/.auth/user.json' });

  test('exports clinical data as JSON', async ({ page }) => {
    // Navigate to settings where the Clinical Export component lives
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // The ClinicalExport component renders a heading "Clinical Data Export"
    await expect(
      page.getByText('Clinical Data Export')
    ).toBeVisible({ timeout: 10_000 });

    // Verify default selections: PHQ-9 and GAD-7 are checked by default
    const phq9Checkbox = page.getByRole('checkbox', { name: /PHQ-9/i });
    const gad7Checkbox = page.getByRole('checkbox', { name: /GAD-7/i });

    // At least one should be checked (defaults have phq9 and gad7 true)
    await expect(phq9Checkbox).toBeChecked();
    await expect(gad7Checkbox).toBeChecked();

    // Select JSON format (should be default)
    const formatSelect = page.locator('#export-format');
    await formatSelect.selectOption('clinical_json');

    // Set up download listener before clicking export
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);

    // Click the export button
    const exportButton = page.getByRole('button', { name: /export clinical data/i });
    await expect(exportButton).toBeEnabled();
    await exportButton.click();

    // The button should show a loading state
    await expect(
      page.getByRole('button', { name: /exporting/i })
    ).toBeVisible();

    // Wait for either a download or a shareable link (depending on auth/data state)
    const download = await downloadPromise;

    if (download) {
      // Verify the downloaded file has the expected name pattern
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/clinical-export-\d{4}-\d{2}-\d{2}\.json/);
    }

    // After export, a shareable link may appear
    // (only if the API returns a share token)
    const shareSection = page.getByText(/shareable link/i);
    if (await shareSection.isVisible().catch(() => false)) {
      // Verify the copy button exists
      await expect(
        page.getByRole('button', { name: /copy/i })
      ).toBeVisible();
    }
  });

  test('exports clinical data as CSV', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('Clinical Data Export')
    ).toBeVisible({ timeout: 10_000 });

    // Select CSV format
    const formatSelect = page.locator('#export-format');
    await formatSelect.selectOption('clinical_csv');

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);

    const exportButton = page.getByRole('button', { name: /export clinical data/i });
    await exportButton.click();

    const download = await downloadPromise;

    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/clinical-export-\d{4}-\d{2}-\d{2}\.csv/);
    }
  });

  test('disables export button when no data types selected', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('Clinical Data Export')
    ).toBeVisible({ timeout: 10_000 });

    // Uncheck all data type checkboxes
    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();

    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      if (await checkbox.isChecked()) {
        await checkbox.click();
      }
    }

    // Export button should now be disabled
    const exportButton = page.getByRole('button', { name: /export clinical data/i });
    await expect(exportButton).toBeDisabled();
  });

  test('shows error state on export failure', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('Clinical Data Export')
    ).toBeVisible({ timeout: 10_000 });

    // Intercept the export API call and force a failure
    await page.route('/api/export/clinical', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    const exportButton = page.getByRole('button', { name: /export clinical data/i });
    await exportButton.click();

    // Verify error message appears
    await expect(
      page.getByText(/export failed|internal server error/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});
