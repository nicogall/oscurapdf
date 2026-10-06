import type * as mupdf from 'mupdf';
import { scrubValue } from '../../domain/side-channel-policy';
import type { SideChannelScrubber } from './scrubber';

const MAX_OUTLINE_ITEMS = 10_000;

/** Collects outline items breadth-first (First/Next links), bounded against cyclic outlines. */
const outlineItems = (root: mupdf.PDFObject): mupdf.PDFObject[] => {
  const items: mupdf.PDFObject[] = [];
  const queue = [root.get('First')];
  while (queue.length > 0 && items.length < MAX_OUTLINE_ITEMS) {
    const item = queue.shift();
    if (item === undefined || !item.isDictionary()) continue;
    items.push(item);
    queue.push(item.get('First'), item.get('Next'));
  }
  return items;
};

/** Bookmark titles. */
export const scrubOutline: SideChannelScrubber = (doc, redactedTexts) => {
  const outlines = doc.getTrailer().get('Root').get('Outlines');
  let count = 0;
  if (!outlines.isDictionary()) return { channel: 'outline', count };
  for (const item of outlineItems(outlines)) {
    const title = item.get('Title');
    if (!title.isString()) continue;
    const scrubbed = scrubValue(title.asString(), redactedTexts);
    if (scrubbed.removed > 0) item.put('Title', doc.newString(scrubbed.value));
    count += scrubbed.removed;
  }
  return { channel: 'outline', count };
};
