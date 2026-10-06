/**
 * Constitution V: coverage MUST NOT decrease.
 * Compares coverage/coverage-summary.json against coverage-baseline.json (repo root: the coverage/
 * folder is wiped by every coverage run, so the baseline cannot live there).
 * With `--update`, writes the current summary as the new baseline.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const METRICS = ['lines', 'branches', 'functions', 'statements'] as const;
type Metric = (typeof METRICS)[number];
type Totals = Record<Metric, { pct: number }>;

export interface Drop {
  metric: Metric;
  baseline: number;
  current: number;
}

export const findDrops = (baseline: Totals, current: Totals): Drop[] =>
  METRICS.filter((m) => current[m].pct + 1e-9 < baseline[m].pct).map((m) => ({
    metric: m,
    baseline: baseline[m].pct,
    current: current[m].pct,
  }));

const readTotals = (path: string): Totals =>
  (JSON.parse(readFileSync(path, 'utf8')) as { total: Totals }).total;

const main = (): number => {
  const summaryPath = 'coverage/coverage-summary.json';
  const baselinePath = 'coverage-baseline.json';
  if (!existsSync(summaryPath)) {
    console.error('coverage-guard: run `npm run test:coverage` first.');
    return 1;
  }
  if (process.argv.includes('--update')) {
    // Totals only: the per-file entries carry absolute paths (they would leak the local user name).
    writeFileSync(baselinePath, `${JSON.stringify({ total: readTotals(summaryPath) }, null, 2)}\n`);
    console.log('coverage-guard: baseline written.');
    return 0;
  }
  if (!existsSync(baselinePath)) {
    console.error('coverage-guard: no coverage-baseline.json; run with --update once and commit it.');
    return 1;
  }
  const drops = findDrops(readTotals(baselinePath), readTotals(summaryPath));
  for (const d of drops) console.error(`coverage-guard: ${d.metric} dropped ${d.baseline}% → ${d.current}%`);
  return drops.length === 0 ? 0 : 1;
};

if (process.argv[1]?.endsWith('compare.ts')) process.exitCode = main();
