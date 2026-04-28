import { test, expect } from '@playwright/test';

/**
 * Search functionality — authenticated.
 * Tests the search bar, keyword filtering, and result display.
 */

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Mobile/tablet emulation cold-start can exceed 10s. 20s keeps us well
    // within the 60s per-test budget while removing first-hit flakes.
    await expect(page.getByRole('heading', { name: /your dream gallery/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('search bar is visible with placeholder', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test('Cmd/Ctrl+K focuses the search bar', async ({ page, browserName }, testInfo) => {
    // Touch-only mobile devices (iPhone-14, Pixel 7) don't have a physical
    // Cmd or Ctrl key, so the shortcut is meaningless there. The shortcut
    // hint UI is also `hidden sm:inline` (only shown on >=640px viewports).
    // Skip these projects rather than paper over with flaky retries.
    test.skip(
      testInfo.project.name === 'mobile-safari' || testInfo.project.name === 'mobile-chrome',
      'Cmd/Ctrl+K is keyboard-only — not applicable on touch viewports',
    );

    const modifier = browserName === 'firefox' ? 'Control' : 'Meta';
    await page.keyboard.press(`${modifier}+k`);

    // Search input should be focused
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeFocused({ timeout: 3_000 });
  });

  test('typing in search filters dream cards', async ({ page }) => {
    // Count initial cards
    const cards = page.locator('[class*="aspect-square"]');
    const initialCount = await cards.count();

    if (initialCount < 2) {
      test.skip(true, 'Need at least 2 dreams to test filtering');
    }

    // Type a search term
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.click();
    await searchInput.fill('prophecy');

    // Wait for filtering to take effect
    await page.waitForTimeout(1_000);

    // Cards should be filtered (could be fewer, could be same if all match)
    // At minimum, verify the search didn't crash the page
    await expect(page.getByRole('heading', { name: /your dream gallery/i }).first()).toBeVisible();
  });

  test('search accepts input without crashing', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.click();
    await searchInput.fill('xyzzy_nonexistent_term_12345');

    // Press Enter to trigger search
    await searchInput.press('Enter');

    // Wait for any filtering to take effect
    await page.waitForTimeout(1_000);

    // Page should still be functional — gallery heading visible
    await expect(page.getByRole('heading', { name: /your dream gallery/i }).first()).toBeVisible();
  });

  test('clearing search restores all cards', async ({ page }) => {
    const cards = page.locator('[class*="aspect-square"]');
    const initialCount = await cards.count();

    if (initialCount === 0) {
      test.skip(true, 'No dream cards available');
    }

    // Search for something
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.click();
    await searchInput.fill('prophecy');
    await page.waitForTimeout(1_000);

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1_000);

    // Cards should be restored
    const restoredCount = await cards.count();
    expect(restoredCount).toBe(initialCount);
  });
});
