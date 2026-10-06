import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_DIR = join(import.meta.dirname, '..', 'fixtures', 'pdf');

/** Reads a generated fixture; fails loudly if `npm run fixtures:build` has not been run. */
export const fixtureBytes = (name: string): ArrayBuffer => {
  const path = join(FIXTURE_DIR, name);
  if (!existsSync(path)) throw new Error(`Missing fixture ${name}: run \`npm run fixtures:build\`.`);
  return new Uint8Array(readFileSync(path)).buffer;
};

export const fixtureTruth = (name: string): unknown =>
  (JSON.parse(readFileSync(join(FIXTURE_DIR, 'manifest.json'), 'utf8')) as Record<string, unknown>)[name];
