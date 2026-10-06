import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

const FIXTURES = join(import.meta.dirname, '..', '..', 'fixtures', 'pdf');

/** Opens a fixture through the file picker on the empty screen. */
export const openFixture = async (page: Page, name: string): Promise<void> => {
  await page.locator('input[type="file"]').setInputFiles(join(FIXTURES, name));
};

/** Drops a fixture onto the app, as a user would drag it from the desktop. */
export const dropFixture = async (page: Page, name: string, selector = '.app'): Promise<void> => {
  const bytes = readFileSync(join(FIXTURES, name)).toString('base64');
  const dataTransfer = await page.evaluateHandle(
    ({ base64, fileName }) => {
      const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([binary], fileName, { type: 'application/pdf' }));
      return transfer;
    },
    { base64: bytes, fileName: name },
  );
  await page.dispatchEvent(selector, 'drop', { dataTransfer });
};
