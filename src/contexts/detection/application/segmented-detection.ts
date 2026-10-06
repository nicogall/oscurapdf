import type { DetectionCandidate } from '@shared-kernel/published';
import { finalizeCandidates } from '../domain/candidate-finalizing';
import { chunkText, type TextChunk } from '../domain/text-chunking';
import type { DetectionOutcome } from './detection-pipeline';
import type { PartialSink, PiiDetector } from './pii-detector';
import type { ProgressSink } from './ports/entity-recognizer';

/** About five pages: small enough to show results early, large enough to keep workers busy. */
export const SEGMENT_CHARS = 12_000;

/** A short text that makes a detector load its model. */
const WARM_UP_TEXT = 'Il sig. Mario Rossi.';

const shift = (candidate: DetectionCandidate, offset: number): DetectionCandidate => ({
  ...candidate,
  range: { start: candidate.range.start + offset, end: candidate.range.end + offset },
});

/** Progress over all segments: the share of segments done, plus the running ones' own progress. */
class SegmentProgress {
  private readonly fractions: number[];

  constructor(
    count: number,
    private readonly sink: ProgressSink | undefined,
  ) {
    this.fractions = new Array<number>(count).fill(0);
  }

  report(segment: number, stage: string, fraction: number): void {
    if (stage === 'models') {
      this.sink?.('models', fraction);
      return;
    }
    this.fractions[segment] = stage === 'ner' ? fraction : 0;
    this.sink?.('ner', this.fractions.reduce((a, b) => a + b, 0) / this.fractions.length);
  }
}

/**
 * Detection over a large document, in parallel (FR-008 performance, 2026-10-01): the text is cut
 * into overlapping segments at line boundaries, a pool of detectors (one per worker) takes them in
 * reading order, and each segment's suggestions are published as soon as it is done. Overlaps are
 * resolved and confirmed names propagated once, over the whole text.
 */
export class SegmentedDetection implements PiiDetector {
  private warm: Promise<void> | undefined;

  constructor(
    private readonly detectors: readonly PiiDetector[],
    private readonly segmentChars = SEGMENT_CHARS,
  ) {}

  /**
   * Loads every model: the first detector alone (it downloads and caches the model; `progress`
   * follows that download), then the others from the cache.
   */
  warmUp(progress?: (fraction: number) => void): Promise<void> {
    this.warm ??= (async () => {
      const [first, ...rest] = this.detectors;
      await first?.execute(WARM_UP_TEXT, (stage, fraction) => {
        if (stage === 'models') progress?.(fraction);
      });
      await Promise.all(rest.map((d) => d.execute(WARM_UP_TEXT)));
    })();
    return this.warm;
  }

  async execute(text: string, progress?: ProgressSink, partial?: PartialSink): Promise<DetectionOutcome> {
    await this.warmUp();
    const segments = chunkText(text, this.segmentChars);
    const tracker = new SegmentProgress(segments.length, progress);
    const results: DetectionCandidate[][] = [];
    let degraded = false;
    let next = 0;
    const run = async (detector: PiiDetector) => {
      for (let i = next++; i < segments.length; i = next++) {
        const segment = segments[i] as TextChunk;
        const outcome = await detector.execute(segment.text, (stage, fraction) => { tracker.report(i, stage, fraction); });
        const shifted = outcome.candidates.map((c) => shift(c, segment.start));
        results[i] = shifted;
        degraded ||= outcome.degraded;
        tracker.report(i, 'ner', 1);
        partial?.(shifted);
      }
    };
    await Promise.all(this.detectors.map(run));
    return { candidates: finalizeCandidates(text, results.flat()), degraded };
  }
}
