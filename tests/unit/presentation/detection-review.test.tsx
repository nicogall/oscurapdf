import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Redaction, RedactionId } from '@app/views';
import { CategoryBadge } from '../../../src/presentation/review-list/category-badge';
import { ConfidenceBadge } from '../../../src/presentation/review-list/confidence-badge';
import { SourceGroups } from '../../../src/presentation/review-list/source-groups';
import { DetectionStatus } from '../../../src/presentation/screens/detection-status';
import { renderWithServices } from '../../support/render-with-services';

const item = (id: string, source: Redaction['source'], confidence: Redaction['confidence'], category: Redaction['category']): Redaction => ({
  id: id as RedactionId,
  kind: 'text',
  text: id,
  key: id,
  occurrences: [{ areas: [{ page: 0 as never, box: { x: 0, y: 0, width: 1, height: 1 } }] }],
  category,
  source,
  confidence,
  selected: confidence !== 'low',
});

const actions = { onSelect: vi.fn(), onDeselect: vi.fn(), onDelete: vi.fn(), onNavigate: vi.fn() };

describe('confidence and category badges', () => {
  it('shows High / Medium and "Suggestion" for low confidence', async () => {
    await renderWithServices(
      <>
        <ConfidenceBadge confidence="high" />
        <ConfidenceBadge confidence="medium" />
        <ConfidenceBadge confidence="low" />
      </>,
    );
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText('Medium')).toBeTruthy();
    expect(screen.getByText('Suggestion').className).toContain('badge--low');
  });

  it('localizes categories in EN and IT, and MANUAL for user items', async () => {
    await renderWithServices(<CategoryBadge category="IT_TAX_CODE" />);
    expect(screen.getByText('Tax code')).toBeTruthy();
    await renderWithServices(<CategoryBadge category="IT_TAX_CODE" />, {}, 'it');
    expect(screen.getByText('Codice fiscale')).toBeTruthy();
    await renderWithServices(<CategoryBadge category="MANUAL" />);
    expect(screen.getByText('MANUAL')).toBeTruthy();
  });
});

describe('SourceGroups', () => {
  it('groups automatic and manual items under their headings', async () => {
    await renderWithServices(
      <SourceGroups items={[item('mario', 'automatic', 'high', 'PERSON'), item('acme', 'manual', 'userConfirmed', 'MANUAL'), item('ref', 'automatic', 'medium', 'PERSON')]} actions={actions} />,
    );
    const [automatic, manual] = screen.getAllByRole('heading');
    expect(automatic?.textContent).toBe('Automatically detected');
    expect(manual?.textContent).toBe('Manually selected');
    expect(document.querySelectorAll('.redaction-item--suggestion')).toHaveLength(1);
  });

  it('omits an empty group', async () => {
    await renderWithServices(<SourceGroups items={[item('acme', 'manual', 'userConfirmed', 'MANUAL')]} actions={actions} />);
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });
});

describe('DetectionStatus', () => {
  it('shows nothing before detection starts', async () => {
    const { container } = await renderWithServices(<DetectionStatus status={{ kind: 'idle' }} />);
    expect(container.textContent).toBe('');
  });

  it.each([
    ['rules', 'Checking patterns (emails, IBANs, cards, codes)'],
    ['ner', 'Finding names'],
    ['models', 'Preparing the analysis tools: 40%'],
  ])('shows the %s stage with progress', async (stage, label) => {
    await renderWithServices(<DetectionStatus status={{ kind: 'running', stage, fraction: 0.4 }} />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('the one-off download says it happens only the first time, in Italian too', async () => {
    await renderWithServices(<DetectionStatus status={{ kind: 'running', stage: 'models', fraction: 0.42 }} />, {}, 'it');
    expect(screen.getByText('Preparazione degli strumenti di analisi: 42%')).toBeTruthy();
    expect(screen.getByText(/Solo la prima volta/)).toBeTruthy();
  });

  it('reports the number of suggestions when done', async () => {
    await renderWithServices(<DetectionStatus status={{ kind: 'done', found: 7 }} />);
    expect(screen.getByText('7 suggestions found. Review them before exporting.')).toBeTruthy();
  });

  it('shows the degraded notice when NER is unavailable', async () => {
    await renderWithServices(<DetectionStatus status={{ kind: 'degraded', found: 2 }} />);
    expect(screen.getByRole('status').textContent).toContain('Automatic detection of names is unavailable');
  });
});
