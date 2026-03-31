import { test, expect } from '@playwright/test';

/**
 * Dream submission flow — authenticated.
 * Tests the full cycle: type dream → submit → see card appear.
 */

test.describe('Dream Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure we're on the main authenticated page
    await expect(page.getByText(/your dream gallery|describe your dream/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('textarea is visible with correct placeholder', async ({ page }) => {
    const textarea = page.locator('#dream-input');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute(
      'placeholder',
      /describe your dream/i
    );
  });

  test('submit button is disabled when textarea is empty', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /submit dream/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button enables when text is entered', async ({ page }) => {
    const textarea = page.locator('#dream-input');
    const submitBtn = page.getByRole('button', { name: /submit dream|processing/i });

    await textarea.fill('I was walking through a garden of light');
    await expect(submitBtn).toBeEnabled();
  });

  test('shows character count when typing', async ({ page }) => {
    const textarea = page.locator('#dream-input');
    await textarea.fill('A short dream');

    // Character count should appear
    await expect(page.getByText(/\/8000/)).toBeVisible();
  });

  test('shows tip for short dreams', async ({ page }) => {
    const textarea = page.locator('#dream-input');
    await textarea.fill('water');

    // Tip should appear for very short input
    await expect(page.getByText(/adding more details/i)).toBeVisible({ timeout: 3_000 });
  });

  test('submits a dream and shows toast + card', async ({ page }) => {
    const textarea = page.locator('#dream-input');
    const dreamText =
      'I dreamed I was walking through an ancient temple with golden walls. ' +
      'A voice from above said "You have been chosen." ' +
      'Light streamed through stained glass windows depicting biblical scenes.';

    // Type the dream
    await textarea.fill(dreamText);

    // Submit
    const submitBtn = page.getByRole('button', { name: /submit dream/i });
    await submitBtn.click();

    // Should show loading state on button
    await expect(
      page.getByRole('button', { name: /processing/i })
    ).toBeVisible({ timeout: 3_000 });

    // Success toast should appear (analysis is synchronous, may take 5-15s)
    await expect(page.getByText(/dream recorded/i)).toBeVisible({
      timeout: 30_000,
    });

    // Textarea should be cleared after successful submission
    await expect(textarea).toHaveValue('');

    // A new card should appear in the dream gallery
    // Wait for the page to refresh and show the new card
    await page.waitForTimeout(2_000); // Give router.refresh() time

    // The dream gallery should have at least one card
    const cards = page.locator('[class*="aspect-square"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  });

  test('Cmd/Ctrl+Enter submits the dream', async ({ page, browserName }) => {
    const textarea = page.locator('#dream-input');
    await textarea.fill('A dream about flying over mountains with eagles');

    // Use Meta+Enter on WebKit/Chromium (Mac), Control+Enter on Firefox
    const modifier = browserName === 'firefox' ? 'Control' : 'Meta';
    await textarea.press(`${modifier}+Enter`);

    // Should start processing
    await expect(
      page.getByRole('button', { name: /processing/i })
    ).toBeVisible({ timeout: 5_000 });
  });
});
