import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as mupdf from 'mupdf';
import { TextModel } from '@ingestion';
import { RedactionSet, buildPlan } from '@review';
import type { RedactionPlan } from '@shared-kernel/published';
import { MuPdfRedactionWriter } from '../../../src/contexts/redaction-engine/infrastructure/mupdf-redaction-writer';
import { MuPdfReader } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-reader';
import { MuPdfSession } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-session';
import { fixtureBytes } from '../../support/fixtures';
import { allText, countOccurrences, openPdf, rawBytesText } from '../../support/mupdf-probe';

/** Loads a fixture, redacts `needle` (all occurrences) and returns the plan plus the model. */
const planFor = async (name: string, needle: string): Promise<{ plan: RedactionPlan; bytes: ArrayBuffer; model: TextModel }> => {
  const bytes = fixtureBytes(name);
  const read = await new MuPdfReader(new MuPdfSession()).read(bytes.slice(0));
  if (!read.ok) throw new Error(read.error);
  const model = TextModel.build(read.value.text);
  const set = new RedactionSet(model);
  const [range] = model.occurrencesOf(needle);
  if (range === undefined) throw new Error(`${needle} not in ${name}`);
  set.addManualText(range);
  const plan = buildPlan(set.items());
  if (!plan.ok) throw new Error(plan.error);
  return { plan: plan.value, bytes, model };
};

const write = async (bytes: ArrayBuffer, plan: RedactionPlan) => {
  const result = await new MuPdfRedactionWriter(() => bytes).write(plan);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

describe('MuPdfRedactionWriter (real mupdf)', () => {
  it('keeps scanned JPEG pages JPEG: the redacted file is about as large as the original (2026-10-02)', async () => {
    const { plan, bytes } = await planFor('scanned-jpeg.pdf', 'Giulia Bianchi');
    const result = await write(bytes, plan);
    expect(result.output.byteLength).toBeLessThan(bytes.byteLength * 1.3);
    const doc = openPdf(result.output);
    for (let i = 0; i < doc.countPages(); i++) {
      const filters: string[] = [];
      (doc.loadPage(i)).getObject().get('Resources').get('XObject').resolve().forEach((image) => filters.push(image.resolve().get('Filter').toString()));
      expect(filters.every((f) => f.includes('DCTDecode')), `page ${String(i + 1)}: ${filters.join()}`).toBe(true);
    }
    expect(allText(doc)).not.toContain('Giulia');
  });

  it('removes every occurrence of the text and draws black boxes', async () => {
    const { plan, bytes } = await planFor('contract-it-en.pdf', 'ACME Holdings Ltd.');
    const result = await write(bytes, plan);
    const text = allText(openPdf(result.output)).toLowerCase();
    expect(text).not.toContain('acme');
    expect(text).not.toMatch(/holdings\s+ltd/);
    expect(text).toContain('john smith');
    expect(text).toContain('rossini');
    expect(result.areasApplied).toBe(4);
  });

  it('removes glyphs from multi-span and rotated pages without touching neighbours', async () => {
    const { plan, bytes } = await planFor('multi-span.pdf', 'Mario Rossi');
    const text = allText(openPdf((await write(bytes, plan)).output));
    expect(text).not.toContain('Mario');
    expect(text).not.toContain('Rossi');
    expect(text).toContain('Signed by');
    expect(text).toContain('on behalf of ACME.');
    expect(text).toContain('Rotated page for');
  });

  it('removes a ligature word', async () => {
    const { plan, bytes } = await planFor('multi-span.pdf', 'final clause');
    const text = allText(openPdf((await write(bytes, plan)).output)).normalize('NFKC');
    expect(text).not.toContain('final');
  });

  it('destroys image pixels under a text redaction (FR-022, Q1)', async () => {
    const { plan, bytes } = await planFor('scanned-with-ocr-layer.pdf', 'Mario Rossi');
    const output = openPdf((await write(bytes, plan)).output);
    expect(allText(output)).not.toContain('Rossi');
    const [area] = plan.areasByPage.get(0 as never) ?? [];
    if (area === undefined) throw new Error('no area');
    const pixmap = output.loadPage(0).toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceGray, false);
    const pixels = pixmap.getPixels();
    const stride = pixmap.getStride();
    const cx = Math.round(area.box.x + area.box.width / 2);
    const cy = Math.round(area.box.y + area.box.height / 2);
    expect(pixels[cy * stride + cx]).toBe(0);
  });

  it('scrubs the name from every side channel and keeps unrelated metadata (FR-021, Q2)', async () => {
    const { plan, bytes } = await planFor('metadata-leak.pdf', 'Mario Rossi');
    const result = await write(bytes, plan);
    const doc = openPdf(result.output);
    const info = ['Author', 'Title', 'Keywords'].map((k) => doc.getMetaData(`info:${k}`) ?? '').join('|');
    expect(info).not.toContain('Rossi');
    expect(doc.getMetaData('info:Producer')).toBe('Synthetic Fixture Producer');
    expect(doc.getMetaData('info:Subject')).toBe('Synthetic record');
    expect(doc.getTrailer().get('Root').get('Metadata').readStream().asString()).not.toContain('Rossi');
    expect(doc.getTrailer().get('Root').get('Outlines').get('First').get('Title').asString()).not.toContain('Rossi');
    expect(doc.loadPage(0).getAnnotations().map((a) => a.getContents()).join('|')).not.toContain('Rossi');
    expect(doc.loadPage(0).getWidgets().map((w) => w.getValue()).join('|')).not.toContain('Rossi');
    expect(Object.keys(doc.getEmbeddedFiles())).toEqual([]);
    expect(result.sideChannelRemovals.map((r) => r.channel).sort()).toEqual(
      ['annotationContents', 'attachment', 'formField', 'infoDictionary', 'outline', 'xmp'].sort(),
    );
  });

  it('leaves the name in no object at all: decompressed raw bytes are clean', async () => {
    for (const [fixture, name] of [
      ['metadata-leak.pdf', 'Mario Rossi'],
      ['scanned-with-ocr-layer.pdf', 'Mario Rossi'],
      ['contract-it-en.pdf', 'John Smith'],
    ] as const) {
      const { plan, bytes } = await planFor(fixture, name);
      const decompressed = openPdf((await write(bytes, plan)).output).saveToBuffer('decompress').asUint8Array();
      const raw = rawBytesText(decompressed);
      for (const word of name.split(' ')) expect(raw, `${fixture}: ${word}`).not.toContain(word);
    }
  });

  it('writes a single revision (no incremental update survives)', async () => {
    const { plan, bytes } = await planFor('metadata-leak.pdf', 'Mario Rossi');
    const output = (await write(bytes, plan)).output;
    expect(openPdf(bytes).countVersions()).toBe(2);
    expect(openPdf(output).countVersions()).toBe(1);
    expect(countOccurrences(new TextDecoder('latin1').decode(output), 'startxref')).toBe(1);
  });

  it('never modifies the original bytes (FR-024)', async () => {
    const { plan, bytes } = await planFor('contract-it-en.pdf', 'John Smith');
    const before = createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
    await write(bytes, plan);
    expect(createHash('sha256').update(new Uint8Array(bytes)).digest('hex')).toBe(before);
  });

  it('reports noDocument when no document is open', async () => {
    const { plan } = await planFor('contract-it-en.pdf', 'John Smith');
    expect(await new MuPdfRedactionWriter(() => undefined).write(plan)).toEqual({ ok: false, error: 'noDocument' });
  });

  it('reports writeFailed for unreadable bytes', async () => {
    const { plan } = await planFor('contract-it-en.pdf', 'John Smith');
    const garbage = new TextEncoder().encode('not a pdf at all').buffer;
    expect(await new MuPdfRedactionWriter(() => garbage).write(plan)).toEqual({ ok: false, error: 'writeFailed' });
  });
});
