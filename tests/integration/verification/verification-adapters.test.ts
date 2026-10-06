import { describe, expect, it } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import { TextModel } from '@ingestion';
import { RedactionSet, buildPlan } from '@review';
import type { RedactionPlan } from '@shared-kernel/published';
import { VerifyRedaction, type CheckKind } from '@verification';
import { MuPdfReader } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-reader';
import { MuPdfSession } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-session';
import { MuPdfRedactionWriter } from '../../../src/contexts/redaction-engine/infrastructure/mupdf-redaction-writer';
import { MuPdfInspector } from '../../../src/contexts/verification/infrastructure/mupdf-inspector';
import { PdfJsParser } from '../../../src/contexts/verification/infrastructure/pdfjs-parser';
import { fixtureBytes } from '../../support/fixtures';

const planFor = async (name: string, needle: string): Promise<{ plan: RedactionPlan; bytes: ArrayBuffer; pages: number }> => {
  const bytes = fixtureBytes(name);
  const read = await new MuPdfReader(new MuPdfSession()).read(bytes.slice(0));
  if (!read.ok) throw new Error(read.error);
  const model = TextModel.build(read.value.text);
  const set = new RedactionSet(model);
  const [range] = model.occurrencesOf(needle);
  if (range === undefined) throw new Error(`${needle} missing`);
  set.addManualText(range);
  const plan = buildPlan(set.items());
  if (!plan.ok) throw new Error(plan.error);
  return { plan: plan.value, bytes, pages: read.value.pages.length };
};

const verify = (output: Uint8Array, plan: RedactionPlan, pages: number) =>
  new VerifyRedaction(new PdfJsParser(), new MuPdfInspector()).execute({ output, plan, inputPageCount: pages, itemsRemoved: 1 });

const failedKinds = async (output: Uint8Array, plan: RedactionPlan, pages: number): Promise<CheckKind[]> =>
  (await verify(output, plan, pages)).checks.filter((c) => !c.passed).map((c) => c.kind);

const writerOutput = async (bytes: ArrayBuffer, plan: RedactionPlan): Promise<Uint8Array> => {
  const result = await new MuPdfRedactionWriter(() => bytes).write(plan);
  if (!result.ok) throw new Error(result.error);
  return result.value.output;
};

describe('verification adapters: real redactions pass', () => {
  it.each([
    ['contract-it-en.pdf', 'ACME Holdings Ltd.'],
    ['multi-span.pdf', 'Mario Rossi'],
    ['metadata-leak.pdf', 'Mario Rossi'],
    ['scanned-with-ocr-layer.pdf', 'Mario Rossi'],
    ['scanned-jpeg.pdf', 'Giulia Bianchi'],
  ])('%s with "%s" is verified', async (fixture, needle) => {
    const { plan, bytes, pages } = await planFor(fixture, needle);
    const report = await verify(await writerOutput(bytes, plan), plan, pages);
    expect(report.checks.filter((c) => !c.passed)).toEqual([]);
    expect(report.outcome).toBe('verified');
  });
});

describe('verification adapters: planted leaks are caught (negative tests)', () => {
  it('an overlay-only black box fails textAbsent and geometry', async () => {
    const { plan, bytes, pages } = await planFor('contract-it-en.pdf', 'John Smith');
    const doc = await PDFDocument.load(bytes.slice(0));
    const area = plan.areasByPage.get(0 as never)?.[0];
    if (area === undefined) throw new Error('no area');
    const page = doc.getPage(0);
    page.drawRectangle({ x: area.box.x, y: page.getHeight() - area.box.y - area.box.height, width: area.box.width, height: area.box.height, color: rgb(0, 0, 0) });
    const kinds = await failedKinds(await doc.save(), plan, pages);
    expect(kinds).toEqual(expect.arrayContaining(['textAbsent', 'geometry']));
  });

  it('a stale incremental revision fails singleRevision', async () => {
    const { plan, bytes, pages } = await planFor('metadata-leak.pdf', 'Mario Rossi');
    expect(await failedKinds(new Uint8Array(bytes), plan, pages)).toContain('singleRevision');
  });

  it('a name left in XMP and other side channels fails sideChannels', async () => {
    const { plan, bytes, pages } = await planFor('metadata-leak.pdf', 'Mario Rossi');
    expect(await failedKinds(new Uint8Array(bytes), plan, pages)).toContain('sideChannels');
  });

  it('unmodified image pixels fail imagePixels', async () => {
    const { plan, bytes, pages } = await planFor('scanned-with-ocr-layer.pdf', 'Mario Rossi');
    expect(await failedKinds(new Uint8Array(bytes), plan, pages)).toContain('imagePixels');
  });

  it('a wrong page count or garbage output fails validPdf', async () => {
    const { plan } = await planFor('contract-it-en.pdf', 'John Smith');
    expect(await failedKinds(new Uint8Array(fixtureBytes('contract-it-en.pdf')), plan, 3)).toContain('validPdf');
    const garbage = await verify(new TextEncoder().encode('%PDF-1.7 broken'), plan, 2);
    expect(garbage.outcome).toBe('failed');
    expect(garbage.checks.every((c) => !c.passed)).toBe(true);
  });
});
