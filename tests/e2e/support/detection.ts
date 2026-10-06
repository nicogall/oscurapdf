import { expect, type Page } from '@playwright/test';

/** Waits until background detection has finished (done or degraded), so tests are deterministic. */
export const waitForDetection = async (page: Page): Promise<void> => {
  await expect(page.locator('.detection-status').filter({ hasText: /suggerimenti trovati|non è disponibile/ })).toBeVisible({ timeout: 240_000 });
};

/**
 * For manual-redaction tests: blocks the NER model files so detection quickly falls back to the
 * rules only (the degraded path of constitution III), then deselects every suggestion.
 * Call before `page.goto`.
 */
export const withRulesOnly = async (page: Page): Promise<void> => {
  await page.route('**/models/**', (route) => route.abort());
};

export const deselectSuggestions = async (page: Page): Promise<void> => {
  await waitForDetection(page);
  await page.getByRole('button', { name: 'Deseleziona tutto' }).click();
};
