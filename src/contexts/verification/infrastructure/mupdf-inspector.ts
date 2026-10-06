import * as mupdf from 'mupdf';
import { err, ok, type PageIndex, type Result } from '@shared-kernel';
import type { RedactionPlan } from '@shared-kernel/published';
import type { Inspection, RedactionInspector } from '../application/ports/redaction-inspector';
import type { GlyphBox } from '../domain/checks/geometry-check';
import type { ImageSample } from '../domain/checks/image-pixel-check';
import { inspectImages } from './inspect-images';
import { inspectSideChannels } from './inspect-side-channels';
import { inspectPageText } from './inspect-text';

const inspectPages = (doc: mupdf.PDFDocument, plan: RedactionPlan) => {
  const pageTexts: string[] = [];
  const glyphs: GlyphBox[] = [];
  const imageSamples: ImageSample[] = [];
  for (let index = 0; index < doc.countPages(); index++) {
    const page = doc.loadPage(index);
    const text = inspectPageText(page, index);
    pageTexts.push(text.text);
    const areas = plan.areasByPage.get(index as PageIndex) ?? [];
    if (areas.length > 0) {
      glyphs.push(...text.glyphs);
      imageSamples.push(...inspectImages(page, index, areas));
    }
    page.destroy();
  }
  return { pageTexts, glyphs, imageSamples };
};

/** Inspects the output with its own MuPDF instance (never the writer's document). */
export class MuPdfInspector implements RedactionInspector {
  inspect(output: Uint8Array, plan: RedactionPlan): Promise<Result<Inspection, 'unparseable'>> {
    let doc: mupdf.PDFDocument | undefined;
    try {
      doc = mupdf.Document.openDocument(output, 'application/pdf') as mupdf.PDFDocument;
      const pages = inspectPages(doc, plan);
      return Promise.resolve(
        ok({ pageCount: doc.countPages(), ...pages, sideChannelValues: inspectSideChannels(doc), revisionCount: doc.countVersions() }),
      );
    } catch {
      return Promise.resolve(err('unparseable'));
    } finally {
      doc?.destroy();
    }
  }
}
