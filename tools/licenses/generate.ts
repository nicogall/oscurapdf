/**
 * Writes public/third-party-licenses.txt: the licence of every package shipped to the browser
 * (production dependency tree), the NER model attribution and the app's own licence. Fails if a
 * shipped package has a licence that is not on the allow-list. Runs before every build.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Licences compatible with distributing the app under AGPL-3.0-or-later. */
export const ALLOWED = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'AGPL-3.0-or-later', '(MIT OR CC0-1.0)', 'BlueOak-1.0.0']);

interface PackageInfo {
  readonly name: string;
  readonly version: string;
  readonly license: string;
  readonly text: string;
}

const read = (path: string): Record<string, unknown> => JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

const licenseText = (dir: string): string => {
  const file = readdirSync(dir).find((f) => /^(licen[sc]e|copying|notice)(\.(md|txt))?$/iu.test(f));
  return file === undefined ? '' : readFileSync(join(dir, file), 'utf8').trim();
};

/** The production dependency tree, from the root package's `dependencies`. */
export const productionPackages = (root = '.'): PackageInfo[] => {
  const found = new Map<string, PackageInfo>();
  const visit = (name: string): void => {
    const dir = join(root, 'node_modules', name);
    if (found.has(name) || !existsSync(join(dir, 'package.json'))) return;
    const pkg = read(join(dir, 'package.json'));
    const license = typeof pkg.license === 'string' ? pkg.license : 'UNKNOWN';
    found.set(name, { name, version: String(pkg.version), license, text: licenseText(dir) });
    for (const dependency of Object.keys((pkg.dependencies as Record<string, string> | undefined) ?? {})) visit(dependency);
  };
  for (const dependency of Object.keys((read(join(root, 'package.json')).dependencies as Record<string, string> | undefined) ?? {})) visit(dependency);
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
};

const MODEL_NOTICE = `NER model: oscurapdf/pii-it-distilbert, fine-tuned for this app from
Davlan/distilbert-base-multilingual-cased-ner-hrl on 22 Italian PII labels (training scripts: tools/pii-model).
Licence of the starting model: Academic Free License v3.0 (AFL-3.0) — https://opensource.org/licenses/AFL-3.0
Base model: distilbert-base-multilingual-cased (Apache-2.0).
Fine-tuning data: rizzoaiacademy/anonimizzazione-testi-italiano (synthetic Italian legal prose, MIT), a sample of
about 52,000 rows.
Training data of the starting model (as stated by its authors): CoNLL-2002/2003, ANERcorp, Europeana Newspapers,
I-CAB (Italian), Latvian NER, Paramopama + Second HAREM, MSRA; some of these corpora are distributed for research purposes.`;

export const render = (packages: readonly PackageInfo[]): string =>
  [
    'Oscura PDF — third-party licences',
    '',
    'This application is free software, licensed under the GNU Affero General Public License v3.0 or later',
    '(AGPL-3.0-or-later). It includes MuPDF (Artifex Software, AGPL-3.0-or-later). The complete source code',
    'is available from the link in the application footer.',
    '',
    MODEL_NOTICE,
    '',
    ...packages.flatMap((p) => ['='.repeat(78), `${p.name} ${p.version} — ${p.license}`, '='.repeat(78), p.text || '(no licence file in the package)', '']),
  ].join('\n');

const main = (): void => {
  const packages = productionPackages();
  const refused = packages.filter((p) => !ALLOWED.has(p.license));
  if (refused.length > 0) {
    console.error(`licenses: not allowed: ${refused.map((p) => `${p.name} (${p.license})`).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  writeFileSync('public/third-party-licenses.txt', render(packages));
  console.log(`licenses: ${String(packages.length)} packages written to public/third-party-licenses.txt`);
};

if (process.argv[1]?.endsWith('generate.ts')) main();
