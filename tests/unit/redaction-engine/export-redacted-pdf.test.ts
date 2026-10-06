import { describe, expect, it } from 'vitest';
import type { PageIndex } from '@shared-kernel';
import type { RedactionPlan } from '@shared-kernel/published';
import { ExportRedactedPdf } from '@engine';
import { RecordingWriter } from '../../support/fakes/recording-writer';

const plan = (areas: number): RedactionPlan => ({
  areasByPage: new Map([
    [0 as PageIndex, Array.from({ length: areas }, (_, i) => ({ box: { x: i, y: 0, width: 1, height: 1 }, origin: 'text' as const }))],
  ]),
  redactedTexts: ['rossi'],
});

describe('ExportRedactedPdf', () => {
  it('passes the plan to the writer and returns its result', async () => {
    const writer = new RecordingWriter();
    const result = await new ExportRedactedPdf(writer).execute(plan(2));
    expect(result.ok && result.value.areasApplied).toBe(2);
    expect(writer.plans).toHaveLength(1);
  });

  it('refuses an empty plan without calling the writer', async () => {
    const writer = new RecordingWriter();
    expect(await new ExportRedactedPdf(writer).execute(plan(0))).toEqual({ ok: false, error: 'emptyPlan' });
    expect(writer.plans).toHaveLength(0);
  });

  it('fails when the writer did not apply every planned area', async () => {
    const result = await new ExportRedactedPdf(new RecordingWriter('skipOne')).execute(plan(3));
    expect(result).toEqual({ ok: false, error: 'writeFailed' });
  });

  it('propagates writer errors', async () => {
    expect(await new ExportRedactedPdf(new RecordingWriter('noDocument')).execute(plan(1))).toEqual({ ok: false, error: 'noDocument' });
  });
});
