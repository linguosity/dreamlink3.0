import { test, expect } from '@playwright/test';

/**
 * Responsive layout tests.
 *
 * These run across all configured projects (desktop, mobile, tablet)
 * thanks to playwright.config.ts — the same tests validate layout
 * at each viewport size automatically.
 */

test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Mobile/tablet emulation cold-start can exceed 10s. 20s keeps us well
    // within the 60s per-test budget while removing first-hit flakes.
    await expect(page.getByRole('heading', { name: /your dream gallery/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('header elements are visible', async ({ page }) => {
    // Brand link should be visible at every viewport. The link uses
    // `aria-label="DreamRiver"` so the accessible name is stable even when
    // the visible label collapses to the "DR" abbreviation on mobile.
    await expect(page.getByRole('link', { name: /^dreamriver$/i }).first()).toBeVisible();

    // Search bar should be visible
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
  });

  test('dream input area is usable', async ({ page }) => {
    const textarea = page.locator('#dream-input').first();
    await expect(textarea).toBeVisible();

    // Textarea should be tappable/clickable
    await textarea.click();
    await expect(textarea).toBeFocused();

    // Type something
    await textarea.fill('Testing responsive input');

    // Submit button should be visible and enabled
    const submitBtn = page.getByRole('button', { name: /submit dream/i }).first();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('dream grid adapts to viewport width', async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport) return;

    const cards = page.locator('[class*="aspect-square"]');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No dream cards available');
    }

    // Get the grid container
    const grid = page.locator('[class*="grid"]').filter({
      has: page.locator('[class*="aspect-square"]'),
    }).first();

    const gridBox = await grid.boundingBox();
    if (!gridBox) return;

    const firstCardBox = await cards.first().boundingBox();
    if (!firstCardBox) return;

    if (viewport.width < 640) {
      // Mobile: single column — card should be nearly full width
      expect(firstCardBox.width).toBeGreaterThan(gridBox.width * 0.8);
    } else if (viewport.width < 1024) {
      // Tablet: 2 columns — card should be roughly half width (minus gap)
      expect(firstCardBox.width).toBeLessThan(gridBox.width * 0.65);
      expect(firstCardBox.width).toBeGreaterThan(gridBox.width * 0.3);
    } else {
      // Desktop: 3 columns — card should be roughly a third
      expect(firstCardBox.width).toBeLessThan(gridBox.width * 0.45);
      expect(firstCardBox.width).toBeGreaterThan(gridBox.width * 0.2);
    }
  });

  test('modal is usable at current viewport', async ({ page }) => {
    const firstCard = page.locator('[class*="aspect-square"]').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    await firstCard.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Modal should not overflow the viewport
    const modalBox = await modal.boundingBox();
    const viewport = page.viewportSize();

    if (modalBox && viewport) {
      // Modal should be fully within the viewport (with some tolerance for animations)
      expect(modalBox.y).toBeGreaterThanOrEqual(-10);
      expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(viewport.height + 10);
    }

    // Tabs should be visible and tappable
    const analysisTab = modal.getByRole('tab', { name: /analysis/i });
    await expect(analysisTab).toBeVisible();

    // Close button or Escape should work
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test('footer is visible when scrolled down', async ({ page }) => {
    // Scroll to the bottom of the page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Footer content should be visible
    await expect(page.getByText(/quick links/i).first()).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText(/all rights reserved/i).first()).toBeVisible();
  });

  test('no horizontal overflow at any viewport', async ({ page }) => {
    // Check that the page doesn't have horizontal scrollbar
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});
