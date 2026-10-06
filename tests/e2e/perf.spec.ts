import { expect, test, type Page } from '@playwright/test';
import { waitForDetection } from './support/detection';
import { openFixture } from './support/drop-file';
import { expectModelsCached, withPersistentProfile } from './support/persistent-profile';

const startLongTaskObserver = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { longTasks: number[] };
    w.longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.longTasks.push(entry.duration);
    }).observe({ type: 'longtask', buffered: false });
  });

test.describe('performance (quickstart 12, SC-001/002/009) @perf', () => {
  test.setTimeout(300_000);

  test('with models cached: reviewable < 10 s, export + verify < 5 s, no main-thread task > 200 ms', async ({ baseURL }) => {
    await withPersistentProfile(baseURL ?? 'http://localhost:4173', async (page) => {
      await page.goto('/');
      // Warm-up (first use downloads and caches the models; excluded from SC-001 by definition).
      await openFixture(page, 'pii-sampler.pdf');
      await waitForDetection(page);
      await expectModelsCached(page);
      await page.reload();
      await startLongTaskObserver(page);

      const opened = Date.now();
      await openFixture(page, 'ten-pages.pdf');
      await waitForDetection(page);
      const reviewable = Date.now() - opened;

      const exportStart = Date.now();
      await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
      await expect(page.getByText('Oscuramento completato')).toBeVisible({ timeout: 60_000 });
      const exportAndVerify = Date.now() - exportStart;

      const longTasks = await page.evaluate(() => (window as unknown as { longTasks: number[] }).longTasks);
      test.info().annotations.push({ type: 'timings', description: `reviewable ${reviewable} ms, export+verify ${exportAndVerify} ms, longest task ${Math.max(0, ...longTasks)} ms` });
      // A long document (43 pages): detection runs in parallel workers and suggestions appear early.
      await page.getByRole('button', { name: 'Torna alla revisione' }).click();
      await page.getByRole('button', { name: 'Chiudi documento' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Chiudi documento' }).click();
      const longOpened = Date.now();
      await openFixture(page, 'long-document.pdf');
      await expect(page.locator('.redaction-item').first()).toBeVisible({ timeout: 60_000 });
      const firstSuggestions = Date.now() - longOpened;
      await waitForDetection(page);
      const longDetection = Date.now() - longOpened;
      test.info().annotations.push({ type: 'long document', description: `first suggestions ${firstSuggestions} ms, detection ${longDetection} ms` });
      expect(firstSuggestions).toBeLessThan(10_000);
      expect(longDetection).toBeLessThan(30_000);

      expect(reviewable).toBeLessThan(10_000);
      expect(exportAndVerify).toBeLessThan(5_000);
      expect(longTasks.filter((d) => d > 200)).toEqual([]);
    });
  });
});
