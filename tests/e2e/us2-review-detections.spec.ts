import { expect, test } from '@playwright/test';
import { openFixture } from './support/drop-file';
import { waitForDetection } from './support/detection';
import { readDownload } from './support/downloaded-pdf';

// Loads the real on-device models in the detection worker (from our own origin only).
test.describe('US2: review automatically detected PII', () => {
  test.setTimeout(300_000);

  test('quickstart 2 + 3: detections listed as suggestions; deselected items survive the export', async ({ page }) => {
    await page.goto('/');
    await openFixture(page, 'pii-sampler.pdf');
    await waitForDetection(page);
    await expect(page.getByText(/suggerimenti trovati/)).toBeVisible();
    await expect(page.getByText(/Il rilevamento automatico dei nomi non è disponibile/)).toHaveCount(0);

    const list = page.locator('.review-list');
    for (const text of ['John Smith', 'john.smith@example.com', 'IT60X0542811101000000123456', '4111 1111 1111 1111', 'RSSMRA85T10A562S']) {
      await expect(list.getByRole('button', { name: text, exact: true })).toBeVisible();
    }
    // A wrong checksum with the right shape, called an IBAN by the text, is still suggested (FR-008, 2026-10-04).
    // The card with a wrong check is not preselected: the rules skip it, and the model may show it as Medium.
    await expect(list.getByRole('button', { name: 'IT60X0542811101000000123457', exact: true })).toBeVisible();
    await expect(page.getByLabel('Oscura "4111 1111 1111 1112"', { exact: true }).and(page.locator(':checked'))).toHaveCount(0);
    await expect(list.getByRole('heading', { name: 'Rilevati automaticamente' })).toBeVisible();

    // FR-010: nothing is removed before export: the text is still in the document.
    await expect(page.locator('[data-char-start]', { hasText: 'IT60X0542811101000000123456' })).toHaveCount(1);

    await page.getByLabel('Oscura "John Smith"').uncheck();
    await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
    await expect(page.getByText('Oscuramento completato')).toBeVisible({ timeout: 60_000 });
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Salva il PDF oscurato' }).click()]);
    const output = await readDownload(download);
    expect(output.text).toContain('John Smith');
    for (const removed of ['IT60X0542811101000000123456', 'john.smith@example.com', 'RSSMRA85T10A562S', 'Mario Rossi']) {
      expect(output.text).not.toContain(removed);
    }
  });
});
