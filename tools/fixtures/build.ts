/**
 * Generates the synthetic PDF corpus into tests/fixtures/pdf/ and writes manifest.json with the
 * ground truth for each file. Deterministic; no real personal data (constitution V).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Fixture } from './fixture';
import * as basicText from './generators/basic-text';
import * as lockedAndScanned from './generators/locked-and-scanned';
import * as metadataLeak from './generators/metadata-leak';
import * as multiSpan from './generators/multi-span';
import * as piiSampler from './generators/pii-sampler';
import * as problemFiles from './generators/problem-files';
import * as scannedWithOcr from './generators/scanned-with-ocr-layer';
import * as signedLetter from './generators/signed-letter';

export const FIXTURE_DIR = 'tests/fixtures/pdf';

const GENERATORS: ReadonlyArray<{ generate(): Promise<Fixture[]> }> = [
  basicText,
  multiSpan,
  lockedAndScanned,
  metadataLeak,
  scannedWithOcr,
  piiSampler,
  signedLetter,
  problemFiles,
];

const main = async (): Promise<void> => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  const manifest: Record<string, unknown> = {};
  for (const generator of GENERATORS) {
    for (const fixture of await generator.generate()) {
      writeFileSync(join(FIXTURE_DIR, fixture.fileName), fixture.bytes);
      manifest[fixture.fileName] = fixture.truth;
      console.log(`fixtures: ${fixture.fileName} (${fixture.bytes.byteLength} bytes)`);
    }
  }
  writeFileSync(join(FIXTURE_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
};

if (process.argv[1]?.endsWith('build.ts')) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
