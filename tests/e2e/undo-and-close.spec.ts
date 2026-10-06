import { expect, test } from '@playwright/test';
import { openFixture } from './support/drop-file';
import { deselectSuggestions, waitForDetection, withRulesOnly } from './support/detection';
import { selectText } from './support/select-text';

test.describe('undo / redo and closing the document', () => {
  test.setTimeout(300_000);

  test('Cmd+Z / Ctrl+Z undoes a wrong redaction and Shift+Cmd+Z / Ctrl+Y redoes it', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'contract-it-en.pdf');
    await deselectSuggestions(page);
    // "Milano" alone is never suggested, so the item exists only through the manual action.
    const milano = page.getByRole('button', { name: 'Milano', exact: true });
    await selectText(page, 'Milano');
    await page.getByRole('button', { name: 'Oscura', exact: true }).click();
    await expect(milano).toBeVisible();

    // ControlOrMeta is Cmd on macOS and Ctrl on Windows / Linux.
    await page.keyboard.press('ControlOrMeta+z');
    await expect(milano).toHaveCount(0);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(milano).toBeVisible();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(milano).toHaveCount(0);
    await page.getByRole('button', { name: 'Ripristina' }).click();
    await expect(milano).toBeVisible();
    // "Deselect all" is one step: a single undo selects everything again.
    await page.getByRole('button', { name: 'Deseleziona tutto' }).click();
    await expect(page.getByRole('button', { name: 'Oscura ed esporta' })).toBeDisabled();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(page.getByRole('button', { name: 'Oscura ed esporta' })).toBeEnabled();
  });

  test('the Redact button stays put while pressed: a click anywhere on it works the first time', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'contract-it-en.pdf');
    await deselectSuggestions(page);
    for (const [word, x] of [['Milano', 0.1], ['SERVICE', 0.3], ['AGREEMENT', 0.9]] as const) {
      await selectText(page, word);
      const redact = page.getByRole('button', { name: 'Oscura', exact: true });
      const box = await redact.boundingBox();
      if (box === null) throw new Error('Redact button not shown');
      // A real press: down and up at the same point, away from the centre of the button.
      await page.mouse.move(box.x + box.width * x, box.y + box.height / 2);
      await page.mouse.down();
      // Hold it like a person does, so the pressed style is applied before the release.
      await page.waitForTimeout(100);
      await page.mouse.up();
      await expect(page.getByRole('button', { name: word, exact: true })).toBeVisible();
    }
  });

  test('hovering a black box shows an X: an automatic item is only deselected, a manual one removed', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'pii-sampler.pdf');
    await waitForDetection(page);
    const iban = page.getByLabel('Oscura "IT60X0542811101000000123456"');
    await expect(iban).toBeChecked();
    const box = page.locator('[data-page-index="0"] [data-testid="redaction-overlay"]').nth(5);
    await box.hover();
    const remove = page.locator('.overlay__remove');
    await expect(remove).toBeVisible();
    const before = await page.getByTestId('redaction-overlay').count();
    await remove.click();
    await expect(page.getByTestId('redaction-overlay')).toHaveCount(before - 1);
    await page.keyboard.press('ControlOrMeta+z');
    await expect(page.getByTestId('redaction-overlay')).toHaveCount(before);
  });

  test('the X asks for confirmation and returns to the start page, ready for another document', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'contract-it-en.pdf');
    await page.getByRole('button', { name: 'Chiudi documento' }).click();
    await page.getByRole('button', { name: 'Continua a lavorare' }).click();
    await expect(page.locator('.page').first()).toBeVisible();
    await page.getByRole('button', { name: 'Chiudi documento' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Chiudi documento' }).click();
    await expect(page.getByText('Trascina qui il tuo PDF')).toBeVisible();
    await openFixture(page, 'pii-sampler.pdf');
    await expect(page.getByText(/pii-sampler\.pdf · /)).toBeVisible();
    // The logo leads to the start page too, after the same confirmation.
    await page.getByRole('link', { name: 'Oscura PDF' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Chiudi documento' }).click();
    await expect(page.getByText('Trascina qui il tuo PDF')).toBeVisible();
  });
});
