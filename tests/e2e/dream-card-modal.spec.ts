import { test, expect } from '@playwright/test';

// The dream modal is queried by data-testid, not getByRole('dialog'). Radix
// renders BOTH the detail Dialog and the scripture-verse Popover with
// role="dialog", so the role matched two elements and every modal assertion
// died on "strict mode violation: resolved to 2 elements". The popover is
// deliberate — Radix Tooltip never opens on touch, which left verse text
// unreachable on mobile (see the note in components/DreamCard.tsx) — so the
// tests accommodate it rather than the component losing it.

// Card queries use data-testid="dream-card" rather than
// [class*="aspect-square"]. That class is shared by the loading skeleton, the
// analysis-timeout card and two modal image containers, so .first() could
// resolve to a shimmer with no title or date — the skip-guard saw something
// visible and let the test run on the wrong element. These specs failed on
// every browser for that reason.

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
    // Wait for either cards to render or the empty state to appear. Calling
    // .count() eagerly returns 0 before the gallery has hydrated, leading
    // the test to incorrectly enter the empty-state branch. We race both
    // possibilities so the test is correct regardless of how slow the
    // network is on this run.
    const cards = page.getByTestId('dream-card');
    const emptyState = page.getByText(/no dreams recorded yet/i).first();

    await Promise.race([
      cards.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
      emptyState.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
    ]);

    if ((await cards.count()) === 0) {
      await expect(emptyState).toBeVisible();
      test.skip(true, 'No dream cards to test — submit a dream first');
    }

    await expect(cards.first()).toBeVisible();
  });

  test('cards show title, date, and tags', async ({ page }) => {
    const firstCard = page.getByTestId('dream-card').first();

    // Skip if no cards
    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    // Card should contain a date badge (e.g. "Mar 31")
    await expect(firstCard.getByTestId('dream-card-date')).toBeVisible();
  });

  test('clicking a card opens the detail modal', async ({ page }) => {
    const firstCard = page.getByTestId('dream-card').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    // Click the card
    await firstCard.click();

    // Modal should appear with dialog role
    const modal = page.getByTestId('dream-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Modal should have a title
    await expect(modal.locator('h2, [class*="DialogTitle"]').first()).toBeVisible();

    // Modal should show the Analysis tab by default
    await expect(modal.getByText(/analysis/i).first()).toBeVisible();
  });

  test('modal content is scrollable for long analyses', async ({ page }) => {
    const firstCard = page.getByTestId('dream-card').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    await firstCard.click();

    const modal = page.getByTestId('dream-modal');
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
    const firstCard = page.getByTestId('dream-card').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    await firstCard.click();

    const modal = page.getByTestId('dream-modal');
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
    const firstCard = page.getByTestId('dream-card').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    await firstCard.click();

    const modal = page.getByTestId('dream-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  // Sharing is a consent dialog, not a row of social links. This test used to
  // assert `a[href*="facebook"], a[href*="twitter"], a[href*="telegram"]` and
  // failed on every browser because those anchors were deliberately removed —
  // see the note in components/ShareDreamButton.tsx: the per-channel links come
  // back only once their formatting is designed. A dream is private by default
  // and sharing mints a scoped, revocable link, so the meaningful assertion is
  // that the choice is presented before any link exists.
  test('modal offers scoped link sharing, off by default', async ({ page }) => {
    const firstCard = page.getByTestId('dream-card').first();

    if (!(await firstCard.isVisible().catch(() => false))) {
      test.skip(true, 'No dream cards available');
    }

    await firstCard.click();

    const modal = page.getByTestId('dream-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // The share control is wrapped in a one-shot coach mark
    // (components/feature-hint.tsx). Whether it's showing depends on
    // profile.dismissed_hints for the test account — state this suite doesn't
    // own — so clear it if present rather than letting it decide the run.
    const dismissHint = page.getByRole('button', { name: /dismiss hint/i }).first();
    if (await dismissHint.isVisible().catch(() => false)) {
      await dismissHint.click();
    }

    const shareButton = modal.getByRole('button', { name: /share this dream/i });
    await expect(shareButton).toBeVisible();

    await shareButton.click();

    // Radix AlertDialog — role="alertdialog", so this can't collide with the
    // detail Dialog or the scripture Popover the way getByRole('dialog') did.
    const consent = page.getByRole('alertdialog');
    await expect(consent).toBeVisible({ timeout: 3_000 });

    // The scope choice is the substance of the dialog: the user decides what
    // the link reveals before one is created.
    await expect(
      consent.getByRole('button', { name: /summary & analysis only/i }),
    ).toBeVisible();
    await expect(
      consent.getByRole('button', { name: /full dream/i }),
    ).toBeVisible();
    await expect(
      consent.getByRole('button', { name: /create share link/i }),
    ).toBeVisible();

    // Deliberately does NOT create the link. Doing so would mint a real
    // public URL for the test account's dream on every CI run, and nothing
    // in this suite revokes it.
    await consent.getByRole('button', { name: /^cancel$/i }).click();
    await expect(consent).not.toBeVisible({ timeout: 3_000 });
  });
});
