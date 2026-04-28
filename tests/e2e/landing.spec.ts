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

    // Brand link in the SiteHeader. The Wordmark composes "DreamRiver"
    // from multiple decorative <span>s but the parent <span> has
    // aria-label="DreamRiver", so the wrapping <a> exposes accessible
    // name "DreamRiver" at every viewport.
    await expect(
      page.getByRole('link', { name: /^dreamriver$/i }).first(),
    ).toBeVisible();

    // Has a primary call-to-action that points at sign-up. We accept
    // multiple verbs because the hero CTA reads "Start Your Dream
    // Journal — Free" while the desktop nav shows "Sign Up". On mobile
    // viewports the desktop "Sign Up" button is collapsed behind the
    // hamburger, but the hero CTA is always visible — so "start" must
    // be in the regex.
    const cta = page.getByRole('link', { name: /sign up|get started|start your|try/i }).first();
    await expect(cta).toBeVisible();
  });

  test('navigates to sign-in page', async ({ page }) => {
    await page.goto('/landing');

    // On <md viewports the SiteHeader collapses Sign In into a hamburger
    // drawer. If the desktop link isn't immediately visible, open the
    // mobile menu first so the same test exercises the same UX intent
    // across all viewports.
    const desktopSignIn = page.getByRole('link', { name: /^sign in$|^log in$/i });
    if (!(await desktopSignIn.first().isVisible().catch(() => false))) {
      const menuToggle = page.getByRole('button', { name: /open menu|close menu/i });
      await menuToggle.click();
    }

    const signInLink = page.getByRole('link', { name: /^sign in$|^log in$/i }).first();
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
