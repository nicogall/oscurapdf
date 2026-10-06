import type * as mupdf from 'mupdf';
import { scrubValue } from '../../domain/side-channel-policy';
import type { SideChannelScrubber } from './scrubber';

/** Replaces the value and regenerates the widget appearance so the old text is not drawn. */
const scrubWidget = (widget: mupdf.PDFWidget, redactedTexts: readonly string[]): number => {
  const scrubbed = scrubValue(widget.getValue(), redactedTexts);
  if (scrubbed.removed === 0) return 0;
  if (widget.isText()) widget.setTextValue(scrubbed.value);
  else widget.getObject().put('V', widget.getObject()._doc.newString(scrubbed.value));
  widget.update();
  return scrubbed.removed;
};

/** Form-field values. */
export const scrubFormFields: SideChannelScrubber = (doc, redactedTexts) => {
  let count = 0;
  for (let index = 0; index < doc.countPages(); index++) {
    for (const widget of doc.loadPage(index).getWidgets()) count += scrubWidget(widget, redactedTexts);
  }
  return { channel: 'formField', count };
};
