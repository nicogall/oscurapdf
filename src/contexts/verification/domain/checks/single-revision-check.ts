import { checkFrom, type VerificationCheck } from '../verification-check';

/** The output has exactly one revision: no earlier (incremental) version can hold old content. */
export const singleRevisionCheck = (revisionCount: number): VerificationCheck =>
  checkFrom('singleRevision', revisionCount === 1 ? [] : [{}]);
