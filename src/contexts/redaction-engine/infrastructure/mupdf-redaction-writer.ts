import * as mupdf from 'mupdf';
import { err, ok, type PageIndex, type Result } from '@shared-kernel';
import type { PlannedArea, RedactionPlan } from '@shared-kernel/published';
import type { ExportError, ProgressSink, RedactionWriter } from '../application/ports/redaction-writer';
import type { ExportResult, SideChannelRemoval } from '../domain/export-result';
import { lineArtModeFor, type LineArtMode } from '../domain/line-art-policy';
import { jpegImageSizes, recompressJpegImages } from './jpeg-recompression';
import { scrubAnnotationContents } from './scrubbers/annotation-contents-scrubber';
import { removeAttachments } from './scrubbers/attachment-remover';
import { scrubFormFields } from './scrubbers/form-field-scrubber';
import { scrubInfoDictionary } from './scrubbers/info-dictionary-scrubber';
import { scrubOutline } from './scrubbers/outline-scrubber';
import type { SideChannelScrubber } from './scrubbers/scrubber';
import { scrubXmp } from './scrubbers/xmp-scrubber';

const SCRUBBERS: readonly SideChannelScrubber[] = [
  scrubInfoDictionary,
  scrubXmp,
  scrubOutline,
  scrubAnnotationContents,
  scrubFormFields,
  removeAttachments,
];

const LINE_ART: Record<LineArtMode, number> = {
  removeIfCovered: mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_COVERED,
  removeIfTouched: mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_TOUCHED,
};

/** Full rewrite: garbage-collects unreferenced objects and drops earlier revisions. */
const SAVE_OPTIONS = 'garbage=4,compress=yes';

/** One applyRedactions pass per line-art mode, because the mode applies to the whole page. */
const applyGroup = (page: mupdf.PDFPage, areas: readonly PlannedArea[], mode: LineArtMode): number => {
  const group = areas.filter((area) => lineArtModeFor(area.origin) === mode);
  if (group.length === 0) return 0;
  for (const { box } of group) {
    page.createAnnotation('Redact').setRect([box.x, box.y, box.x + box.width, box.y + box.height]);
  }
  page.applyRedactions(true, mupdf.PDFPage.REDACT_IMAGE_PIXELS, LINE_ART[mode], mupdf.PDFPage.REDACT_TEXT_REMOVE);
  return group.length;
};

const applyPage = (doc: mupdf.PDFDocument, pageIndex: PageIndex, areas: readonly PlannedArea[]): number => {
  const page = doc.loadPage(pageIndex);
  const jpegs = jpegImageSizes(page);
  const applied = applyGroup(page, areas, 'removeIfCovered') + applyGroup(page, areas, 'removeIfTouched');
  // Keeps scanned pages small: redacted JPEG images are JPEG again (pixels already blacked out).
  recompressJpegImages(doc, page, jpegs);
  return applied;
};

const applyPlan = (doc: mupdf.PDFDocument, plan: RedactionPlan, progress?: ProgressSink): number => {
  const pages = [...plan.areasByPage.entries()];
  let applied = 0;
  pages.forEach(([pageIndex, areas], i) => {
    applied += applyPage(doc, pageIndex, areas);
    progress?.('redact', (i + 1) / pages.length);
  });
  return applied;
};

const scrubSideChannels = (doc: mupdf.PDFDocument, redactedTexts: readonly string[]): SideChannelRemoval[] =>
  redactedTexts.length === 0 ? [] : SCRUBBERS.map((scrub) => scrub(doc, redactedTexts)).filter((r) => r.count > 0);

/**
 * Writes a new PDF with every planned area removed (text, image pixels, line art), side
 * channels scrubbed and a full rewrite. Works on a copy: the original bytes are never modified.
 */
export class MuPdfRedactionWriter implements RedactionWriter {
  constructor(private readonly source: () => ArrayBuffer | undefined) {}

  write(plan: RedactionPlan, progress?: ProgressSink): Promise<Result<ExportResult, ExportError>> {
    const original = this.source();
    if (original === undefined) return Promise.resolve(err('noDocument'));
    return Promise.resolve(this.writeCopy(new Uint8Array(original).slice(), plan, progress));
  }

  private writeCopy(copy: Uint8Array, plan: RedactionPlan, progress?: ProgressSink): Result<ExportResult, ExportError> {
    let doc: mupdf.PDFDocument | undefined;
    try {
      doc = mupdf.Document.openDocument(copy, 'application/pdf') as mupdf.PDFDocument;
      const areasApplied = applyPlan(doc, plan, progress);
      const sideChannelRemovals = scrubSideChannels(doc, plan.redactedTexts);
      const output = new Uint8Array(doc.saveToBuffer(SAVE_OPTIONS).asUint8Array());
      return ok({ output, areasApplied, sideChannelRemovals });
    } catch {
      return err('writeFailed');
    } finally {
      doc?.destroy();
    }
  }
}
