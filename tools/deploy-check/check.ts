/**
 * Checks a build folder before publishing: no file above the static host's per-file limit
 * (Cloudflare Pages: 25 MiB), and the headers file present. Usage: tsx tools/deploy-check/check.ts dist
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const HOST_FILE_LIMIT = 25 * 1024 * 1024;

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)]));

/** Problems found in a build folder (empty when it can be published). */
export const deployProblems = (dir: string): string[] => [
  ...filesUnder(dir)
    .filter((path) => statSync(path).size > HOST_FILE_LIMIT)
    .map((path) => `${path} is ${String(Math.round(statSync(path).size / 1048576))} MiB (limit 25 MiB)`),
  ...(existsSync(join(dir, '_headers')) ? [] : [`${dir}/_headers is missing`]),
];

const main = (): void => {
  const dir = process.argv[2] ?? 'dist';
  const problems = deployProblems(dir);
  for (const problem of problems) console.error(`deploy-check: ${problem}`);
  if (problems.length > 0) process.exitCode = 1;
  else console.log(`deploy-check: ${dir} can be published`);
};

if (process.argv[1]?.endsWith('check.ts')) main();
