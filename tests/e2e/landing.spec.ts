import { test, expect } from '@playwright/test';

/**
 * Landing page & public routes — no auth required.
 * These tests run WITHOUT the stored auth session so we can
 * verify the unauthenticated experience.
 */

test.use({ storageState: { cookies: [], origins: [] } }); // clear auth

test.describe('Landing Page', () => {
  test('renders brand name and CTA', async ({ page }) => {
    await page.goto('/landing');

    // Brand name visible
    await expect(page.getByText(/dreamriver/i).first()).toBeVisible();

    // Has a call-to-action button (sign up / get started / try free)
    const cta = page.getByRole('link', { name: /sign up|get started|try/i }).first();
    await expect(cta).toBeVisible();
  });

  test('navigates to sign-in page', async ({ page }) => {
    await page.goto('/landing');

    // Click sign-in link
    const signInLink = page.getByRole('link', { name: /sign in|log in/i }).first();
    await expect(signInLink).toBeVisible();
    await signInLink.click();

    // Should land on sign-in page
    await expect(page).toHaveURL(/sign-in/);
  });

  test('sign-in page has email and password fields', async ({ page }) => {
    await page.goto('/sign-in');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });

  test('redirects unauthenticated users away from main page', async ({ page }) => {
    await page.goto('/');

    // Should redirect to landing or sign-in
    await expect(page).toHaveURL(/landing|sign-in/);
  });
});
