import { TextModel } from '@ingestion';
import { pageText } from './page-text-builder';

/** A two-page synthetic document for review tests (TextModel satisfies the review's DocumentText). */
export const reviewDocument = (): TextModel =>
  TextModel.build([
    pageText(0, ['The agreement is between ACME', 'Holdings Ltd. and John Smith.']),
    pageText(1, ['acme holdings ltd. pays ROSSI.', 'Rossini is not Rossi.']),
  ]);

export const rangeOf = (model: TextModel, needle: string, nth = 0): { start: number; end: number } => {
  let at = -1;
  for (let i = 0; i <= nth; i++) at = model.text.indexOf(needle, at + 1);
  if (at < 0) throw new Error(`"${needle}" not found`);
  return { start: at, end: at + needle.length };
};
