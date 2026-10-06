import { describe, expect, it, vi } from 'vitest';
import type { DetectionCandidate } from '@shared-kernel/published';
import { SegmentedDetection, type PiiDetector } from '@detection';

/** A fake worker: finds every "Rossi" in its segment, reporting progress; optionally degraded. */
const worker = (log: string[], name: string, degraded = false): PiiDetector => ({
  execute: vi.fn((text: string, progress?: (stage: string, fraction: number) => void) => {
    log.push(`${name}:${text.slice(0, 6)}`);
    progress?.('ner', 0.5);
    const candidates: DetectionCandidate[] = [...text.matchAll(/Rossi/g)].map((m) => ({
      range: { start: m.index, end: m.index + 5 },
      category: 'PERSON',
      confidence: 'high',
      method: 'ner',
    }));
    return Promise.resolve({ candidates, degraded });
  }),
});

const LINES = Array.from({ length: 12 }, (_, i) => `Riga ${String(i).padStart(2, '0')}: il sig. Rossi firma.`);
const TEXT = LINES.join('\n');

describe('SegmentedDetection', () => {
  it('splits the text, maps every result back to document offsets, and removes overlap duplicates', async () => {
    const detection = new SegmentedDetection([worker([], 'a'), worker([], 'b')], 100);
    const outcome = await detection.execute(TEXT);
    const found = outcome.candidates.map((c) => TEXT.slice(c.range.start, c.range.end));
    expect(found).toEqual(LINES.map(() => 'Rossi'));
    expect(outcome.degraded).toBe(false);
  });

  it('shares segments between the workers, in reading order, and publishes each as soon as it is done', async () => {
    const log: string[] = [];
    const partial: number[] = [];
    const detection = new SegmentedDetection([worker(log, 'a'), worker(log, 'b')], 100);
    await detection.execute(TEXT, undefined, (candidates) => partial.push(candidates.length));
    const work = log.filter((l) => !l.includes('Il sig'));
    expect(new Set(work.map((l) => l.split(':')[0]))).toEqual(new Set(['a', 'b']));
    expect(work.map((l) => l.split(':')[1])).toEqual([...work.map((l) => l.split(':')[1])].sort());
    expect(partial.length).toBe(work.length);
  });

  it('warms every worker once: the first alone (it fills the model cache), then the others', async () => {
    const log: string[] = [];
    const detection = new SegmentedDetection([worker(log, 'a'), worker(log, 'b'), worker(log, 'c')], 100);
    await Promise.all([detection.warmUp(), detection.warmUp()]);
    expect(log).toEqual(['a:Il sig', 'b:Il sig', 'c:Il sig']);
  });

  it('is degraded if any segment was, and reports overall progress', async () => {
    const progress = vi.fn();
    const detection = new SegmentedDetection([worker([], 'a', true)], 100);
    const outcome = await detection.execute(TEXT, progress);
    expect(outcome.degraded).toBe(true);
    expect(progress).toHaveBeenCalledWith('ner', expect.any(Number));
    expect(progress.mock.calls.at(-1)).toEqual(['ner', 1]);
  });

  it('forwards model-download progress as it is', async () => {
    const progress = vi.fn();
    const downloading: PiiDetector = {
      execute: (_text, report) => {
        report?.('models', 0.4);
        return Promise.resolve({ candidates: [], degraded: false });
      },
    };
    await new SegmentedDetection([downloading], 100).execute(TEXT, progress);
    expect(progress).toHaveBeenCalledWith('models', 0.4);
  });
});
