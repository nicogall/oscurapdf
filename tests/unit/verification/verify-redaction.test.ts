import { describe, expect, it } from 'vitest';
import { err, ok, type PageIndex } from '@shared-kernel';
import { VerifyRedaction, type IndependentPdfParser, type Inspection, type RedactionInspector } from '@verification';

const plan = {
  areasByPage: new Map([[0 as PageIndex, [{ box: { x: 10, y: 10, width: 50, height: 10 }, origin: 'text' as const }]]]),
  redactedTexts: ['mario rossi'],
};

const cleanInspection: Inspection = {
  pageCount: 2,
  pageTexts: ['Patient: , file 2024/17.', ''],
  glyphs: [{ page: 0, box: { x: 0, y: 0, width: 5, height: 5 } }],
  sideChannelValues: [{ channel: 'infoDictionary', text: 'Synthetic Fixture Producer' }],
  imageSamples: [],
  revisionCount: 1,
};

const parser = (pageTexts = ['Patient: , file', '']): IndependentPdfParser => ({
  parse: () => Promise.resolve(ok({ pageCount: 2, pageTexts })),
});
const inspector = (inspection: Partial<Inspection> = {}): RedactionInspector => ({
  inspect: () => Promise.resolve(ok({ ...cleanInspection, ...inspection })),
});

const verify = (p: IndependentPdfParser, i: RedactionInspector) =>
  new VerifyRedaction(p, i).execute({ output: new Uint8Array([1, 2, 3]), plan, inputPageCount: 2, itemsRemoved: 1 });

describe('VerifyRedaction', () => {
  it('is verified when all six checks pass', async () => {
    const report = await verify(parser(), inspector());
    expect(report.outcome).toBe('verified');
    expect(report.itemsRemoved).toBe(1);
    expect(report.checks.map((c) => c.kind)).toEqual(['validPdf', 'textAbsent', 'geometry', 'sideChannels', 'imagePixels', 'singleRevision']);
  });

  it.each([
    ['textAbsent', parser(['Patient: Mario Rossi', '']), inspector()],
    ['geometry', parser(), inspector({ glyphs: [{ page: 0, box: { x: 20, y: 12, width: 4, height: 4 } }] })],
    ['sideChannels', parser(), inspector({ sideChannelValues: [{ channel: 'xmp', text: 'Mario Rossi' }] })],
    ['imagePixels', parser(), inspector({ imageSamples: [{ page: 0, uniform: false }] })],
    ['singleRevision', parser(), inspector({ revisionCount: 2 })],
    ['validPdf', parser(), inspector({ pageCount: 3 })],
  ] as const)('fails when %s fails', async (kind, p, i) => {
    const report = await verify(p, i);
    expect(report.outcome).toBe('failed');
    expect(report.checks.find((c) => c.kind === kind)?.passed).toBe(false);
  });

  it('fails every check when an engine cannot parse the output', async () => {
    const unparseable: IndependentPdfParser = { parse: () => Promise.resolve(err('unparseable')) };
    const report = await verify(unparseable, inspector());
    expect(report.outcome).toBe('failed');
    expect(report.checks.every((c) => !c.passed)).toBe(true);
  });

  it('gives each engine its own copy of the output', async () => {
    const seen: Uint8Array[] = [];
    const p: IndependentPdfParser = { parse: (o) => (seen.push(o), Promise.resolve(ok({ pageCount: 2, pageTexts: [] }))) };
    const i: RedactionInspector = { inspect: (o) => (seen.push(o), Promise.resolve(ok(cleanInspection))) };
    const output = new Uint8Array([9]);
    await new VerifyRedaction(p, i).execute({ output, plan, inputPageCount: 2, itemsRemoved: 1 });
    expect(seen[0]).not.toBe(output);
    expect(seen[1]).not.toBe(seen[0]);
  });
});
