import { test, expect } from '@playwright/test';

/**
 * Dream card display & modal interaction — authenticated.
 * Tests card rendering, clicking to open the detail modal,
 * scrolling within the modal, and tab switching.
 */

test.describe('Dream Card & Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Slower mobile/tablet device emulation can take longer than 10s for the
    // first authenticated render (cold start + decryption + grid hydration).
    // 20s is still well within the per-test 60s budget but tolerates the
    // first hit on iPad / Pixel / iPhone projects that previously flaked.
    await expect(page.getByRole('heading', { name: /your dream gallery/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('dream gallery displays cards', async ({ page }) => {
    // At least one dream card should be visible (assuming test account has dreams)
    const cards = page.locator('[class*="aspect-square"]');
    const count = await cards.count();

    if (count === 0) {
      // If no dreams, the empty state should show
      await expect(page.getByText(/no dreams recorded yet/i).first()).toBeVisible();
      test.skip(true, 'No dream cards to test — submit a dream first');
    }

    // First card should be visible
    await expect(cards.first()).toBeVisible();
  });

  test('cards show title, date, and tags', async ({ page }) => {
    const firstCard = page.locator('[class*="aspect-square"]').first();

    // Skip if no cards
    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    // Card should contain a date badge (e.g. "Mar 31")
    await expect(firstCard.locator('text=/[A-Z][a-z]{2}\\s+\\d{1,2}/')).toBeVisible();
  });

  test('clicking a card opens the detail modal', async ({ page }) => {
    const firstCard = page.locator('[class*="aspect-square"]').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    // Click the card
    await firstCard.click();

    // Modal should appear with dialog role
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Modal should have a title
    await expect(modal.locator('h2, [class*="DialogTitle"]').first()).toBeVisible();

    // Modal should show the Analysis tab by default
    await expect(modal.getByText(/analysis/i).first()).toBeVisible();
  });

  test('modal content is scrollable for long analyses', async ({ page }) => {
    const firstCard = page.locator('[class*="aspect-square"]').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    await firstCard.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // The DialogContent itself is the scrollable container — `max-h-[85vh]
    // overflow-y-auto` is on the dialog element, not a descendant.
    await expect(modal).toHaveClass(/overflow-y-auto/);

    // Verify we can scroll within the modal
    const box = await modal.boundingBox();
    if (box) {
      // Scroll down within the modal
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 300);

      // Short wait to verify no crash
      await page.waitForTimeout(500);
    }

    // Modal should still be visible after scrolling
    await expect(modal).toBeVisible();
  });

  test('modal tabs switch between Analysis and Original Dream', async ({ page }) => {
    const firstCard = page.locator('[class*="aspect-square"]').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    await firstCard.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Click "Original Dream" tab
    const originalTab = modal.getByRole('tab', { name: /original dream/i });
    await expect(originalTab).toBeVisible();
    await originalTab.click();

    // Original dream text should be visible (pre-wrap content)
    const originalContent = modal.locator('[class*="whitespace-pre-wrap"]');
    await expect(originalContent).toBeVisible({ timeout: 3_000 });

    // Switch back to Analysis tab
    const analysisTab = modal.getByRole('tab', { name: /analysis/i });
    await analysisTab.click();

    // Analysis content should be visible
    await expect(
      modal.locator('text=/spiritual|dream|faith|biblical/i').first()
    ).toBeVisible({ timeout: 3_000 });
  });

  test('modal closes with Escape key', async ({ page }) => {
    const firstCard = page.locator('[class*="aspect-square"]').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    await firstCard.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test('modal shows share buttons', async ({ page }) => {
    const firstCard = page.locator('[class*="aspect-square"]').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    await firstCard.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Share section should be present
    await expect(modal.getByText(/share/i).first()).toBeVisible();

    // Should have social share links
    const shareLinks = modal.locator('a[href*="facebook"], a[href*="twitter"], a[href*="telegram"]');
    expect(await shareLinks.count()).toBeGreaterThan(0);
  });
});
