import { expect, test } from '@playwright/test';

// Needs a built site that points at a running Worker with Razorpay TEST keys (see README, "Phase 2 · Commerce").
// The payment itself stays manual: this only proves the form creates an order and Razorpay's window opens.
test.skip(!process.env.E2E_RAZORPAY, 'needs Razorpay test keys');

test('Pay creates an order and opens the Razorpay checkout window', async ({ page }) => {
  await page.goto('/checkout/websites-launch/');
  const form = page.getByRole('form', { name: 'Checkout' });
  await form.getByLabel('Name').fill('Test Buyer');
  await form.getByLabel('Email').fill('test.buyer@example.com');
  await form.getByLabel('Phone').fill('9876543210');

  await form.getByRole('button', { name: /^Pay / }).click();

  await expect(page.locator('iframe.razorpay-checkout-frame')).toBeVisible({ timeout: 15_000 });
});
