import type * as mupdf from 'mupdf';
import { scrubValue } from '../../domain/side-channel-policy';
import type { SideChannelScrubber } from './scrubber';

const scrubAnnotation = (annotation: mupdf.PDFAnnotation, redactedTexts: readonly string[]): number => {
  const contents = scrubValue(annotation.getContents(), redactedTexts);
  if (contents.removed > 0) annotation.setContents(contents.value);
  const author = scrubValue(annotation.getAuthor(), redactedTexts);
  if (author.removed > 0) annotation.setAuthor(author.value);
  if (contents.removed + author.removed > 0) annotation.update();
  return contents.removed + author.removed;
};

/** Comment text and authors of every non-widget annotation. */
export const scrubAnnotationContents: SideChannelScrubber = (doc, redactedTexts) => {
  let count = 0;
  for (let index = 0; index < doc.countPages(); index++) {
    const page = doc.loadPage(index);
    for (const annotation of page.getAnnotations()) count += scrubAnnotation(annotation, redactedTexts);
  }
  return { channel: 'annotationContents', count };
};
