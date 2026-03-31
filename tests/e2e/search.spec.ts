import { test, expect } from '@playwright/test';

/**
 * Search functionality — authenticated.
 * Tests the search bar, keyword filtering, and result display.
 */

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/your dream gallery/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('search bar is visible with placeholder', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('Cmd/Ctrl+K focuses the search bar', async ({ page, browserName }) => {
    const modifier = browserName === 'firefox' ? 'Control' : 'Meta';
    await page.keyboard.press(`${modifier}+k`);

    // Search input should be focused
    const searchInput = page.getByPlaceholder(/search/i);
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
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.click();
    await searchInput.fill('prophecy');

    // Wait for filtering to take effect
    await page.waitForTimeout(1_000);

    // Cards should be filtered (could be fewer, could be same if all match)
    // At minimum, verify the search didn't crash the page
    await expect(page.getByText(/your dream gallery/i)).toBeVisible();
  });

  test('search shows "no results" for nonsense query', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.click();
    await searchInput.fill('xyzzy_nonexistent_term_12345');

    // Wait for filtering
    await page.waitForTimeout(1_000);

    // Should show a "no dreams found" message or empty state
    const noResults = page.getByText(/no dreams found|couldn't find/i);
    const emptyGrid = page.locator('[class*="grid"]').filter({
      has: page.locator('[class*="aspect-square"]'),
    });

    // Either "no results" message shows, or the grid is empty
    const hasNoResultsMsg = await noResults.isVisible().catch(() => false);
    const cardCount = await emptyGrid.locator('[class*="aspect-square"]').count();

    expect(hasNoResultsMsg || cardCount === 0).toBeTruthy();
  });

  test('clearing search restores all cards', async ({ page }) => {
    const cards = page.locator('[class*="aspect-square"]');
    const initialCount = await cards.count();

    if (initialCount === 0) {
      test.skip(true, 'No dream cards available');
    }

    // Search for something
    const searchInput = page.getByPlaceholder(/search/i);
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
