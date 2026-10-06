import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * A real on-disk browser profile. Playwright's default contexts keep storage in memory, where
 * Cache Storage refuses the 279 MB model; a real profile caches it like a user's browser does.
 */
export const withPersistentProfile = async (baseURL: string, run: (page: Page, context: BrowserContext) => Promise<void>): Promise<void> => {
  const dir = mkdtempSync(join(tmpdir(), 'redactor-profile-'));
  const context = await chromium.launchPersistentContext(dir, { headless: true, baseURL, acceptDownloads: true });
  try {
    await run(await context.newPage(), context);
  } finally {
    await context.close();
    rmSync(dir, { recursive: true, force: true });
  }
};

/** Waits until the NER model file is in the offline model cache. */
export const expectModelsCached = async (page: Page): Promise<void> => {
  await expect
    .poll(
      () => page.evaluate(async () => (await (await caches.open('detection-models')).keys()).filter((r) => r.url.endsWith('.onnx')).length),
      { timeout: 60_000 },
    )
    .toBe(1);
};
