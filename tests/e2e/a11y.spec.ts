import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { deselectSuggestions, withRulesOnly } from './support/detection';
import { openFixture } from './support/drop-file';
import { selectText } from './support/select-text';

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const expectNoViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).exclude('.text-layer').analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
};

test.describe('accessibility (WCAG 2.1 AA)', () => {
  test.setTimeout(300_000);

  test('empty, reviewing and verified screens have no violations', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await expectNoViolations(page);
    await openFixture(page, 'contract-it-en.pdf');
    await deselectSuggestions(page);
    await selectText(page, 'John Smith');
    await page.getByRole('button', { name: 'Oscura', exact: true }).click();
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
    await expect(page.getByText('Oscuramento completato')).toBeVisible();
    await expectNoViolations(page);
  });

  test('review and export are fully operable with the keyboard', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'contract-it-en.pdf');
    await deselectSuggestions(page);
    await selectText(page, 'John Smith');
    await page.getByRole('button', { name: 'Oscura', exact: true }).click();
    const checkbox = page.getByLabel('Oscura "John Smith"');
    await checkbox.focus();
    await page.keyboard.press('Space');
    await expect(checkbox).not.toBeChecked();
    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked();
    await page.getByRole('button', { name: 'Oscura ed esporta' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Oscuramento completato')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salva il PDF oscurato' })).toBeFocused();
    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    expect(download.suggestedFilename()).toBe('contract-it-en-redacted.pdf');
  });
});

test.describe('accessibility of the failure path @fault', () => {
  test.setTimeout(300_000);

  test('verification-failed screen and acknowledgement dialog have no violations', async ({ page }) => {
    await withRulesOnly(page);
    await page.goto('/');
    await openFixture(page, 'contract-it-en.pdf');
    await deselectSuggestions(page);
    await selectText(page, 'John Smith');
    await page.getByRole('button', { name: 'Oscura', exact: true }).click();
    await page.getByRole('button', { name: 'Oscura ed esporta' }).click();
    await expect(page.getByText('Non è stato possibile verificare questo oscuramento.')).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Salva comunque…' }).click();
    await expectNoViolations(page);
  });
});
