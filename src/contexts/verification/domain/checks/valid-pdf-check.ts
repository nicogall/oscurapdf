import { checkFrom, type VerificationCheck } from '../verification-check';

export interface PageCounts {
  readonly expectedPageCount: number;
  readonly independentPageCount?: number;
  readonly inspectorPageCount?: number;
}

/** Opens in both engines, and the page count equals the input's. */
export const validPdfCheck = ({ expectedPageCount, independentPageCount, inspectorPageCount }: PageCounts): VerificationCheck =>
  checkFrom('validPdf', independentPageCount === expectedPageCount && inspectorPageCount === expectedPageCount ? [] : [{}]);
