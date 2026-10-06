/** Where a check failed. Page and redaction index only: never document text (safe to show/log). */
export interface FailureLocator {
  readonly page?: number;
  readonly redactionIndex?: number;
}
