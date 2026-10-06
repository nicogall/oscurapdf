import { expect, test } from '@playwright/test';
import { waitForDetection } from './support/detection';
import { openFixture } from './support/drop-file';
import { expectModelsCached, withPersistentProfile } from './support/persistent-profile';
import { selectText } from './support/select-text';

test.describe('offline (quickstart 10, SC-005, FR-029)', () => {
  test.setTimeout(300_000);
  test.skip(({ browserName }) => browserName !== 'chromium', 'Uses a persistent Chromium profile; Playwright WebKit cannot reload a page offline.');

  test('after the first load, the full workflow (with on-device NER) works with the network disconnected', async ({ baseURL }) => {
    await withPersistentProfile(baseURL ?? 'http://localhost:4173', async (page, context) => {
      await page.goto('/');
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      // First use online: the detection model is downloaded once and kept on the device.
      await openFixture(page, 'pii-sampler.pdf');
      await waitForDetection(page);
      await expectModelsCached(page);

      await context.setOffline(true);
      await page.reload();
      await expect(page.getByText('Trascina qui il tuo PDF')).toBeVisible();
      await openFixture(page, 'contract-it-en.pdf');
      await waitForDetection(page);
      await expect(page.getByText(/Il rilevamento automatico dei nomi non è disponibile/)).toHaveCount(0);
      await page.getByRole('button', { name: 'Deseleziona tutto' }).click();
      await selectText(page, 'John Smith');
      await page.getByRole('button', { name: 'Oscura', exact: true }).click();
      await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
      await expect(page.getByText('Oscuramento completato')).toBeVisible({ timeout: 60_000 });
    });
  });
});
