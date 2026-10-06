import { expect, test } from '@playwright/test';

test.describe('interface language (FR-033, decision 2026-10-01: Italian only) @it-locale', () => {
  test('an Italian browser gets Italian, with no language switch', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Il tuo documento non lascia mai questo dispositivo.')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await expect(page.getByLabel('Lingua')).toHaveCount(0);
  });
});

test.describe('interface language for other browsers', () => {
  test('a non-Italian browser also gets Italian, and a stored English preference is ignored', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('redactor.language', 'en');
      } catch {
        // storage unavailable: nothing to override
      }
    });
    await page.goto('/');
    await expect(page.getByText('Il tuo documento non lascia mai questo dispositivo.')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  });
});
