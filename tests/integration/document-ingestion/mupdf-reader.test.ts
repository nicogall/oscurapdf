import { afterEach, describe, expect, it } from 'vitest';
import { TextModel } from '@ingestion';
import { MuPdfSession } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-session';
import { MuPdfReader } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-reader';
import { MuPdfRasterizer } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-rasterizer';
import { fixtureBytes, fixtureTruth } from '../../support/fixtures';

const session = new MuPdfSession();
const reader = new MuPdfReader(session);

afterEach(async () => {
  await reader.close();
});

const readOk = async (name: string) => {
  const result = await reader.read(fixtureBytes(name));
  if (!result.ok) throw new Error(`expected ${name} to open, got ${result.error}`);
  return result.value;
};

describe('MuPdfReader (real mupdf)', () => {
  it('extracts one box per character for multi-span lines', async () => {
    const contents = await readOk('multi-span.pdf');
    const truth = fixtureTruth('multi-span.pdf') as { runsLine: string; ligatureText: string };
    const model = TextModel.build(contents.text);
    expect(model.text).toContain(truth.runsLine);
    expect(model.occurrencesOf(truth.ligatureText)).toHaveLength(1);
    for (const span of model.spans) expect(span.charBoxes).toHaveLength(span.range.end - span.range.start);
  });

  it('maps a rotated page into page space (y down, rotation applied)', async () => {
    const contents = await readOk('multi-span.pdf');
    const rotated = contents.pages[1];
    expect(rotated?.rotation).toBe(90);
    expect(rotated?.size).toEqual({ width: 842, height: 595 });
    const model = TextModel.build(contents.text);
    const [range] = model.occurrencesOf('Rotated page');
    const areas = range ? model.areasFor(range) : [];
    expect(areas.length).toBeGreaterThan(0);
    for (const { box } of areas) {
      expect(box.x + box.width).toBeLessThanOrEqual(842);
      expect(box.y + box.height).toBeLessThanOrEqual(595);
      expect(box.height).toBeGreaterThan(box.width / 'Rotated page'.length);
    }
  });

  it('finds all three occurrences in the contract, one across a line break', async () => {
    const model = TextModel.build((await readOk('contract-it-en.pdf')).text);
    const found = model.occurrencesOf('ACME Holdings Ltd.');
    expect(found).toHaveLength(3);
    expect(found.map((r) => model.pageOf(r))).toEqual([0, 0, 1]);
    expect(found[0] && model.areasFor(found[0])).toHaveLength(2);
  });

  it('reports password-protected documents', async () => {
    expect(await reader.read(fixtureBytes('locked.pdf'))).toEqual({ ok: false, error: 'passwordProtected' });
  });

  it('reports image-only pages as having no extractable text but images', async () => {
    const contents = await readOk('scan-only.pdf');
    expect(contents.pages.map((p) => p.hasExtractableText)).toEqual([false, false]);
    expect(contents.pages.every((p) => p.hasImages)).toBe(true);
  });

  it('reports garbage as invalid', async () => {
    const garbage = new TextEncoder().encode('%PDF-1.7\nthis is not really a pdf').buffer;
    expect(await reader.read(garbage)).toEqual({ ok: false, error: 'invalid' });
  });

  it('renders pixels at the requested scale and fails after close', async () => {
    await readOk('contract-it-en.pdf');
    const rasterizer = new MuPdfRasterizer(session, (pixels) => Promise.resolve(pixels as unknown as ImageBitmap));
    const result = await rasterizer.render(0 as never, 0.5);
    expect(result.ok && result.value.width).toBe(Math.round(595 * 0.5));
    await reader.close();
    expect(await rasterizer.render(0 as never, 1)).toEqual({ ok: false, error: 'renderFailed' });
  });
});

