export type SideChannel = 'infoDictionary' | 'xmp' | 'outline' | 'annotationContents' | 'formField' | 'attachment';

export interface SideChannelRemoval {
  readonly channel: SideChannel;
  readonly count: number;
}

/** The new PDF and what was applied. Carries no text payload. */
export interface ExportResult {
  readonly output: Uint8Array;
  readonly areasApplied: number;
  readonly sideChannelRemovals: readonly SideChannelRemoval[];
}
