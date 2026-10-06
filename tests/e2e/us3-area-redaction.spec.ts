import { expect, test } from '@playwright/test';
import * as mupdf from 'mupdf';
import { SIGNATURE_BOX } from '../../tools/fixtures/generators/signed-letter';
import { deselectSuggestions, withRulesOnly } from './support/detection';
import { openFixture } from './support/drop-file';
import { readDownload } from './support/downloaded-pdf';

const VIEWER_SCALE = 1.25;

test.describe('US3: draw a rectangle redaction', () => {
  test.setTimeout(300_000);

  test('quickstart 4: drawing over the signature destroys its pixels and the text on it', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'signed-letter.pdf');
    await deselectSuggestions(page);
    await page.getByRole('button', { name: 'Seleziona area' }).click();
    await expect(page.getByRole('button', { name: 'Seleziona area' })).toHaveAttribute('aria-pressed', 'true');

    const pageBox = await page.locator('[data-page-index="0"]').boundingBox();
    if (pageBox === null) throw new Error('page not rendered');
    const at = (x: number, y: number) => ({ x: pageBox.x + x * VIEWER_SCALE, y: pageBox.y + y * VIEWER_SCALE });
    const start = at(SIGNATURE_BOX.x - 2, SIGNATURE_BOX.y - 2);
    const end = at(SIGNATURE_BOX.x + SIGNATURE_BOX.width + 2, SIGNATURE_BOX.y + SIGNATURE_BOX.height + 2);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();

    await expect(page.getByRole('button', { name: 'Area, pagina 1', exact: true })).toBeVisible();
    await expect(page.getByTestId('redaction-overlay')).toHaveCount(1);
    await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
    await expect(page.getByText('Oscuramento completato')).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Salva il PDF oscurato' }).click()]);
    const output = await readDownload(download);
    expect(output.text).not.toContain('Signed');
    const pixmap = output.doc.loadPage(0).toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceGray, false);
    const centre = Math.round(SIGNATURE_BOX.y + SIGNATURE_BOX.height / 2) * pixmap.getStride() + Math.round(SIGNATURE_BOX.x + SIGNATURE_BOX.width / 2);
    expect(pixmap.getPixels()[centre]).toBe(0);
  });

  test('Esc cancels a drag and nothing is added', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'signed-letter.pdf');
    await deselectSuggestions(page);
    await page.getByRole('button', { name: 'Seleziona area' }).click();
    const pageBox = await page.locator('[data-page-index="0"]').boundingBox();
    if (pageBox === null) throw new Error('page not rendered');
    await page.mouse.move(pageBox.x + 50, pageBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(pageBox.x + 200, pageBox.y + 150, { steps: 4 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.getByRole('button', { name: /^Area, pagina/ })).toHaveCount(0);
  });
});
