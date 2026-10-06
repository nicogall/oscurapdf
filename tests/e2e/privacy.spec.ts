import { expect, test } from '@playwright/test';
import { PII_TRUTH } from '../../tools/fixtures/generators/pii-sampler';
import { waitForDetection } from './support/detection';
import { openFixture } from './support/drop-file';
import { NetworkRecorder } from './support/network-recorder';

test.describe('privacy (quickstart 9, SC-004, FR-027–FR-030)', () => {
  test.setTimeout(300_000);

  test('a full session sends nothing: only same-origin static GETs, no bodies, no PII in URLs', async ({ page, baseURL }) => {
    const recorder = new NetworkRecorder(page, baseURL ?? 'http://localhost:4173');
    recorder.start();
    await page.goto('/');
    await openFixture(page, 'pii-sampler.pdf');
    await waitForDetection(page);
    await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
    await expect(page.getByText('Oscuramento completato')).toBeVisible({ timeout: 60_000 });
    await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Salva il PDF oscurato' }).click()]);
    await page.getByRole('button', { name: 'Torna alla revisione' }).click();

    expect(recorder.requests.length).toBeGreaterThan(0);
    expect(recorder.violations()).toEqual([]);
    const secrets = [...PII_TRUTH.expected.map((e) => e.text), 'pii-sampler'];
    expect(recorder.urlsContaining(secrets)).toEqual([]);
  });

  test('document data never reaches persistent storage (only the language preference)', async ({ page }) => {
    await page.goto('/');
    await openFixture(page, 'pii-sampler.pdf');
    await waitForDetection(page);
    const stored = await page.evaluate(() => Object.keys(localStorage).map((key) => `${key}=${localStorage.getItem(key) ?? ''}`));
    expect(stored.every((entry) => entry.startsWith('redactor.language='))).toBe(true);
  });
});
