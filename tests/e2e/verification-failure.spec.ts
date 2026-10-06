import { expect, test } from '@playwright/test';
import { openFixture } from './support/drop-file';
import { deselectSuggestions, withRulesOnly } from './support/detection';
import { selectText } from './support/select-text';

// Runs against the `build:e2e-fault` server, whose writer silently skips one area (quickstart 8).
test.describe('verification failure path @fault', () => {
  test.setTimeout(300_000);

  test('a writer bug is caught: never "complete"; saving needs the acknowledgement (FR-026, FR-026a)', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'contract-it-en.pdf');
    await deselectSuggestions(page);
    await selectText(page, 'John Smith');
    await page.getByRole('button', { name: 'Oscura', exact: true }).click();
    await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
    await expect(page.getByText('Non è stato possibile verificare questo oscuramento.')).toBeVisible();
    await expect(page.getByText('Il documento non è stato contrassegnato come oscurato in modo sicuro.')).toBeVisible();
    await expect(page.getByText('Oscuramento completato')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Torna alla revisione' })).toBeFocused();
    await page.getByRole('button', { name: 'Salva comunque…' }).click();
    const save = page.getByRole('button', { name: 'Salva', exact: true });
    await expect(save).toBeDisabled();
    await page.getByLabel('Ho capito che questo file potrebbe contenere ancora le informazioni oscurate').check();
    const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
    expect(download.suggestedFilename()).toBe('contract-it-en-redacted.pdf');
  });
});
