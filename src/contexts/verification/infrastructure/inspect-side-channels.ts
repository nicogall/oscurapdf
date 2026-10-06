import type * as mupdf from 'mupdf';
import type { SideChannelValue } from '../domain/checks/side-channel-check';

const stringValues = (dict: mupdf.PDFObject): string[] => {
  const values: string[] = [];
  if (dict.isDictionary()) dict.forEach((value) => {
    if (value.isString()) values.push(value.asString());
  });
  return values;
};

const outlineTitles = (outlines: mupdf.PDFObject): string[] => {
  const titles: string[] = [];
  if (!outlines.isDictionary()) return titles;
  const queue = [outlines.get('First')];
  while (queue.length > 0 && titles.length < 10_000) {
    const item = queue.shift();
    if (item === undefined || !item.isDictionary()) continue;
    const title = item.get('Title');
    if (title.isString()) titles.push(title.asString());
    queue.push(item.get('First'), item.get('Next'));
  }
  return titles;
};

const annotationValues = (doc: mupdf.PDFDocument): SideChannelValue[] => {
  const values: SideChannelValue[] = [];
  for (let index = 0; index < doc.countPages(); index++) {
    const page = doc.loadPage(index);
    for (const a of page.getAnnotations()) values.push({ channel: 'annotationContents', text: `${a.getContents()} ${a.getAuthor()}` });
    for (const w of page.getWidgets()) values.push({ channel: 'formField', text: w.getValue() });
  }
  return values;
};

const attachmentValues = (doc: mupdf.PDFDocument): SideChannelValue[] =>
  Object.entries(doc.getEmbeddedFiles()).map(([name, spec]) => ({
    channel: 'attachment',
    text: `${name} ${new TextDecoder().decode(doc.getEmbeddedFileContents(spec)?.asUint8Array() ?? new Uint8Array())}`,
  }));

/** Every text value in the side channels of FR-021. */
export const inspectSideChannels = (doc: mupdf.PDFDocument): SideChannelValue[] => {
  const root = doc.getTrailer().get('Root');
  const metadata = root.get('Metadata');
  return [
    ...stringValues(doc.getTrailer().get('Info')).map((text) => ({ channel: 'infoDictionary', text })),
    ...(metadata.isStream() ? [{ channel: 'xmp', text: metadata.readStream().asString() }] : []),
    ...outlineTitles(root.get('Outlines')).map((text) => ({ channel: 'outline', text })),
    ...annotationValues(doc),
    ...attachmentValues(doc),
  ];
};
