import type * as mupdf from 'mupdf';
import { attachmentDecision } from '../../domain/side-channel-policy';
import type { SideChannelScrubber } from './scrubber';

const decode = (bytes: Uint8Array | undefined): string => (bytes === undefined ? '' : new TextDecoder('utf-8').decode(bytes));

const refersTo = (object: mupdf.PDFObject, target: number): boolean => object.isIndirect() && object.asIndirect() === target;

/** Removes the file spec from an associated-files (/AF, PDF 2.0) array. */
const dropFromAssociatedFiles = (owner: mupdf.PDFObject, target: number): void => {
  const associated = owner.get('AF');
  if (!associated.isArray()) return;
  for (let i = associated.length - 1; i >= 0; i--) {
    if (refersTo(associated.get(i), target)) associated.delete(i);
  }
};

/** Deletes file-attachment annotations that point at the file spec. */
const dropAttachmentAnnotations = (page: mupdf.PDFPage, target: number): void => {
  for (const annotation of page.getAnnotations()) {
    if (annotation.getType() === 'FileAttachment' && refersTo(annotation.getObject().get('FS'), target)) {
      page.deleteAnnotation(annotation);
    }
  }
};

/** Every reference must go, or garbage collection keeps the embedded stream in the output. */
const dropEverywhere = (doc: mupdf.PDFDocument, name: string, fileSpec: mupdf.PDFObject): void => {
  const target = fileSpec.isIndirect() ? fileSpec.asIndirect() : -1;
  doc.deleteEmbeddedFile(name);
  dropFromAssociatedFiles(doc.getTrailer().get('Root'), target);
  for (let index = 0; index < doc.countPages(); index++) {
    const page = doc.loadPage(index);
    dropFromAssociatedFiles(page.getObject(), target);
    dropAttachmentAnnotations(page, target);
  }
};

/** Embedded files: removed entirely if the name or text content contains redacted text. */
export const removeAttachments: SideChannelScrubber = (doc, redactedTexts) => {
  let count = 0;
  for (const [name, fileSpec] of Object.entries(doc.getEmbeddedFiles())) {
    const content = decode(doc.getEmbeddedFileContents(fileSpec)?.asUint8Array());
    if (attachmentDecision(name, content, redactedTexts) === 'keep') continue;
    dropEverywhere(doc, name, fileSpec);
    count += 1;
  }
  return { channel: 'attachment', count };
};
