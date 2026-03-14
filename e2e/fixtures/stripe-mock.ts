import type { Page } from '@playwright/test';

/**
 * Intercepts Stripe-related API calls and checkout redirects
 * so E2E tests never hit real Stripe.
 */
export async function mockStripeRoutes(page: Page): Promise<void> {
  // Mock checkout session creation
  await page.route('**/api/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://checkout.stripe.com/mock-session',
        sessionId: 'cs_test_mock_session',
      }),
    });
  });

  // Mock customer portal
  await page.route('**/api/portal', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://billing.stripe.com/mock-portal',
      }),
    });
  });

  // Intercept Stripe redirect URLs — stay in the app
  await page.route('https://checkout.stripe.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body><h1>Mock Stripe Checkout</h1></body></html>',
    });
  });

  await page.route('https://billing.stripe.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body><h1>Mock Stripe Portal</h1></body></html>',
    });
  });
}
