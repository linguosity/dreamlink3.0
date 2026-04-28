import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

/**
 * Authenticate once and save the session state.
 * All other test projects reuse this stored session,
 * so login only happens once per test run.
 *
 * Required env vars:
 *   TEST_USER_EMAIL    — Supabase user email
 *   TEST_USER_PASSWORD — Supabase user password
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing TEST_USER_EMAIL or TEST_USER_PASSWORD environment variables.\n' +
      'Add them to your .env file or pass them inline:\n' +
      '  TEST_USER_EMAIL=you@example.com TEST_USER_PASSWORD=secret npx playwright test'
    );
  }

  // Navigate to sign-in page
  await page.goto('/sign-in');

  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Submit the form
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for redirect to the main page (authenticated)
  await page.waitForURL('/', { timeout: 15_000 });

  // Verify we landed on the authenticated main page
  await expect(page.getByRole('heading', { name: /your dream gallery/i }).first()).toBeVisible({
    timeout: 10_000,
  });

  // Pre-dismiss the cookie consent banner so it doesn't appear in any test.
  // The banner has role="dialog" and was making `getByRole('dialog')` matchers
  // ambiguous (the dream-detail modal and the cookie banner both matched).
  // Storing the dismissal flag in localStorage lets storageState carry it
  // across to every test project that reuses this session.
  await page.evaluate(() =>
    localStorage.setItem('dreamriver-cookie-consent', 'accepted'),
  );

  // Save signed-in state for reuse
  await page.context().storageState({ path: authFile });
});
