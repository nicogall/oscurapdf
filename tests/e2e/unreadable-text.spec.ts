import { expect, test } from '@playwright/test';
import { withRulesOnly } from './support/detection';
import { openFixture } from './support/drop-file';
import { readDownload } from './support/downloaded-pdf';

const PRIVATE_USE = /[-]/u;

test.describe('FR-037: text with a broken character map', () => {
  test.setTimeout(300_000);

  test('is reported, outlined, not selectable as text, and redacted by dragging over it', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'broken-character-map.pdf');
    await expect(page.getByRole('status').filter({ hasText: 'Testo non leggibile automaticamente nelle pagine: 1.' })).toBeVisible();
    // The readable lines stay in the text layer; the unreadable one does not.
    const layer = page.locator('[data-page-index="0"] .text-layer');
    await expect(layer).toContainText('Recapito del conduttore');
    expect(await layer.textContent()).not.toMatch(PRIVATE_USE);

    const zone = page.getByTestId('unreadable-zone');
    await expect(zone).toHaveCount(1);
    const box = await zone.boundingBox();
    if (box === null) throw new Error('zone not rendered');
    await page.mouse.move(box.x + 1, box.y + 1);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 1, box.y + box.height - 1, { steps: 6 });
    await page.mouse.up();
    await expect(page.getByRole('button', { name: 'Area, pagina 1', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
    await expect(page.getByText('Oscuramento completato')).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Salva il PDF oscurato' }).click()]);
    const output = await readDownload(download);
    expect(output.text).toContain('Recapito del conduttore');
    expect(output.text).not.toMatch(PRIVATE_USE);
  });
});
