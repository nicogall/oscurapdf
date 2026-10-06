import { expect, test } from '@playwright/test';
import { deselectSuggestions, withRulesOnly } from './support/detection';
import { openFixture } from './support/drop-file';

const CHECKED_WORDING = /\bchecked\b(?! automatically)|no pii found|safely redacted|redaction complete/i;

test.describe('US4: unsupported or problematic files', () => {
  test.setTimeout(300_000);

  for (const [file, message] of [
    ['not-a-pdf.txt', 'Questo file non è un PDF'],
    ['corrupt.pdf', 'Questo PDF è danneggiato'],
    ['51mb.pdf', 'Questo file supera i 50 MB'],
    ['locked.pdf', 'protetto da password'],
    ['scan-only.pdf', 'Questo PDF sembra una scansione o un documento composto da immagini. L\'oscuramento automatico del testo non è al momento supportato.'],
  ] as const) {
    test(`quickstart 7: ${file} is refused with its own message`, async ({ page }) => {
      await page.goto('/');
      await openFixture(page, file);
      await expect(page.getByRole('alert')).toContainText(message);
      await expect(page.locator('main')).not.toHaveText(CHECKED_WORDING);
      await page.getByRole('button', { name: 'Scegli un altro file' }).click();
      await expect(page.getByText('Trascina qui il tuo PDF')).toBeVisible();
    });
  }

  test('a partially scanned PDF lists unchecked pages, and rectangles still work there', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'partially-scanned.pdf');
    await expect(page.getByRole('status').filter({ hasText: 'controllate automaticamente: 2' })).toBeVisible();
    await deselectSuggestions(page);
    await page.getByRole('button', { name: 'Seleziona area' }).click();
    const scanned = page.locator('[data-page-index="1"]');
    // The page is taller than the viewport: bring its top into view so the drag lands on it.
    await scanned.evaluate((element) => {
      element.scrollIntoView({ block: 'start' });
    });
    const box = await scanned.boundingBox();
    if (box === null) throw new Error('page 2 not rendered');
    await page.mouse.move(box.x + 40, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 90, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByRole('button', { name: 'Area, pagina 2', exact: true })).toBeVisible();
  });
});
