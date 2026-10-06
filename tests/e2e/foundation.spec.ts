import { expect, test } from '@playwright/test';
import { dropFixture, openFixture } from './support/drop-file';

test.describe('foundation: open, render, select', () => {
  test('opens a PDF, renders every page and exposes selectable text', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Il tuo documento non lascia mai questo dispositivo.')).toBeVisible();
    await openFixture(page, 'contract-it-en.pdf');
    await expect(page.locator('.page')).toHaveCount(2);
    await expect(page.locator('[data-char-start]').filter({ hasText: 'Holdings Ltd. and John Smith' })).toHaveCount(1);
    const painted = await page.locator('.page__canvas').first().evaluate((canvas: HTMLCanvasElement) => canvas.width > 0);
    expect(painted).toBe(true);
  });

  test('asks before replacing an open document', async ({ page }) => {
    await page.goto('/');
    await openFixture(page, 'contract-it-en.pdf');
    await expect(page.locator('.page')).toHaveCount(2);
    await dropFixture(page, 'ten-pages.pdf');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Elimina e apri' }).click();
    await expect(page.locator('.page')).toHaveCount(10);
  });
});
