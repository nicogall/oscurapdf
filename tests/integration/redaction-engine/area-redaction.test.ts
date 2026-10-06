import { describe, expect, it } from 'vitest';
import * as mupdf from 'mupdf';
import type { PageIndex } from '@shared-kernel';
import type { RedactionPlan } from '@shared-kernel/published';
import { VerifyRedaction } from '@verification';
import { MuPdfRedactionWriter } from '../../../src/contexts/redaction-engine/infrastructure/mupdf-redaction-writer';
import { MuPdfInspector } from '../../../src/contexts/verification/infrastructure/mupdf-inspector';
import { PdfJsParser } from '../../../src/contexts/verification/infrastructure/pdfjs-parser';
import { SIGNATURE_BOX, STAMP } from '../../../tools/fixtures/generators/signed-letter';
import { fixtureBytes } from '../../support/fixtures';
import { allText, openPdf } from '../../support/mupdf-probe';

/** The rectangle covers only the left part of the stamp, so the circle stroke crosses its edge. */
const STAMP_PART = { x: STAMP.cx - STAMP.radius - 5, y: STAMP.cy - 20, width: STAMP.radius, height: 40 };

const plan: RedactionPlan = {
  areasByPage: new Map([
    [0 as PageIndex, [{ box: SIGNATURE_BOX, origin: 'area' as const }, { box: STAMP_PART, origin: 'area' as const }]],
  ]),
  redactedTexts: [],
};

const render = (bytes: Uint8Array) => {
  const pixmap = openPdf(bytes).loadPage(0).toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false);
  const pixels = pixmap.getPixels();
  const stride = pixmap.getStride();
  return (x: number, y: number): number[] => [0, 1, 2].map((k) => pixels[Math.round(y) * stride + Math.round(x) * 3 + k] ?? -1);
};

const redacted = async (): Promise<Uint8Array> => {
  const bytes = fixtureBytes('signed-letter.pdf');
  const result = await new MuPdfRedactionWriter(() => bytes).write(plan);
  if (!result.ok) throw new Error(result.error);
  return result.value.output;
};

describe('rectangle redactions (US3, FR-022)', () => {
  const imageCount = (bytes: Uint8Array): number => {
    let images = 0;
    openPdf(bytes).loadPage(0).toStructuredText('preserve-images').walk({ onImageBlock: () => (images += 1) });
    return images;
  };

  it('an image fully under the box is removed and the result verifies', async () => {
    const output = await redacted();
    const report = await new VerifyRedaction(new PdfJsParser(), new MuPdfInspector()).execute({ output, plan, inputPageCount: 1, itemsRemoved: 2 });
    expect(report.checks.filter((c) => !c.passed)).toEqual([]);
    expect(imageCount(output)).toBe(0);
  });

  it('a partly covered image keeps its other pixels; the covered ones are replaced (imagePixels check)', async () => {
    const left = { ...SIGNATURE_BOX, width: SIGNATURE_BOX.width * 0.6 };
    const partial: RedactionPlan = { areasByPage: new Map([[0 as PageIndex, [{ box: left, origin: 'area' as const }]]]), redactedTexts: [] };
    const bytes = fixtureBytes('signed-letter.pdf');
    const result = await new MuPdfRedactionWriter(() => bytes).write(partial);
    if (!result.ok) throw new Error(result.error);
    expect(imageCount(result.value.output)).toBe(1);
    const inspection = await new MuPdfInspector().inspect(result.value.output, partial);
    expect(inspection.ok && inspection.value.imageSamples).toEqual([{ page: 0, uniform: true }]);
    const original = await new MuPdfInspector().inspect(new Uint8Array(bytes), partial);
    expect(original.ok && original.value.imageSamples).toEqual([{ page: 0, uniform: false }]);
  });

  it('removes text drawn over the image', async () => {
    expect(allText(openPdf(await redacted()))).not.toContain('Signed');
    expect(allText(openPdf(new Uint8Array(fixtureBytes('signed-letter.pdf'))))).toContain('Signed');
  });

  it('removes a vector stroke the rectangle only touches, including outside the box', async () => {
    const before = render(new Uint8Array(fixtureBytes('signed-letter.pdf')));
    const after = render(await redacted());
    const outsideBox = { x: STAMP.cx + STAMP.radius, y: STAMP.cy };
    expect(before(outsideBox.x, outsideBox.y)).not.toEqual([255, 255, 255]);
    expect(after(outsideBox.x, outsideBox.y)).toEqual([255, 255, 255]);
  });

  it('draws the black box over the area', async () => {
    const after = render(await redacted());
    expect(after(SIGNATURE_BOX.x + SIGNATURE_BOX.width / 2, SIGNATURE_BOX.y + SIGNATURE_BOX.height / 2)).toEqual([0, 0, 0]);
  });
});
