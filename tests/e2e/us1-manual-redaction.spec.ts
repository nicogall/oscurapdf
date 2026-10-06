import { expect, test, type Page } from '@playwright/test';
import { openFixture } from './support/drop-file';
import { readDownload } from './support/downloaded-pdf';
import { deselectSuggestions, withRulesOnly } from './support/detection';
import { selectText } from './support/select-text';

const redactAndSave = async (page: Page) => {
  await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
  await expect(page.getByText('Oscuramento completato')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Salva il PDF oscurato' }).click()]);
  return readDownload(download);
};

test.describe('US1: manually redact selected text and export a verified PDF', () => {
  test.setTimeout(300_000);

  test('quickstart 1: "ACME Holdings Ltd." across a line break, all 3 occurrences removed', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'contract-it-en.pdf');
    await expect(page.locator('.page')).toHaveCount(2);
    await deselectSuggestions(page);
    await selectText(page, 'ACME', 'Ltd.');
    await page.getByRole('button', { name: 'Oscura', exact: true }).click();
    // A manual selection of an already-detected text (the company is now suggested by its legal form)
    // keeps its category but moves to the manual group.
    await expect(page.locator('.source-group').filter({ hasText: 'Selezionati manualmente' }).getByText('×3')).toBeVisible();
    await expect(page.getByTestId('redaction-overlay')).toHaveCount(4);
    const output = await redactAndSave(page);
    expect(output.fileName).toBe('contract-it-en-redacted.pdf');
    expect(output.text.toLowerCase()).not.toContain('acme');
    expect(output.text).toContain('John Smith');
    expect(output.rawDecompressed.toLowerCase()).not.toContain('acme');
  });

  test('quickstart 5: a scanned page with a hidden text layer loses the picture of the name too', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'scanned-with-ocr-layer.pdf');
    await deselectSuggestions(page);
    await selectText(page, 'Mario Rossi');
    await page.getByRole('button', { name: 'Oscura', exact: true }).click();
    await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
    await expect(page.getByText('Oscuramento completato')).toBeVisible();
    await page.getByText(/^Dettagli dei \d+ controlli$/).click();
    await expect(page.getByText('Contenuto delle immagini sotto i riquadri rimosso')).toBeVisible();
  });

  test('quickstart 6: the name disappears from every side channel; unrelated metadata stays', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'metadata-leak.pdf');
    await deselectSuggestions(page);
    await selectText(page, 'Mario Rossi');
    await page.getByRole('button', { name: 'Oscura', exact: true }).click();
    const output = await redactAndSave(page);
    expect(output.rawDecompressed).not.toContain('Rossi');
    expect(output.doc.getMetaData('info:Producer')).toBe('Synthetic Fixture Producer');
    expect(output.doc.countVersions()).toBe(1);
  });

  test('deselecting everything disables Redact & Export; deleting removes the item', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'contract-it-en.pdf');
    await deselectSuggestions(page);
    await selectText(page, 'John Smith');
    await page.getByRole('button', { name: 'Oscura', exact: true }).click();
    await page.getByRole('button', { name: 'Deseleziona tutto' }).click();
    await expect(page.getByRole('button', { name: 'Oscura ed esporta' })).toBeDisabled();
    await page.getByRole('button', { name: 'Rimuovi John Smith' }).click();
    await expect(page.getByRole('button', { name: 'Rimuovi John Smith' })).toHaveCount(0);
  });
});
