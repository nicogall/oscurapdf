/**
 * Builds the labelled synthetic IT+EN corpus (tools/ner-eval/corpus/*.jsonl), deterministically.
 * Names are common first/last-name combinations; organizations are fictional. No real people.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import type { EvalCategory, LabelledEntity } from './metrics';
import { seededRandom } from './synthetic-identifiers';

export interface CorpusSentence {
  readonly text: string;
  readonly entities: readonly LabelledEntity[];
}

interface LanguagePack {
  readonly templates: readonly string[];
  readonly first: readonly string[];
  readonly last: readonly string[];
  readonly LOCATION: readonly string[];
  readonly ORGANIZATION: readonly string[];
}

const IT: LanguagePack = {
  templates: [
    'Il signor {PERSON} risiede a {LOCATION} dal 2019.',
    'La società {ORGANIZATION} ha sede a {LOCATION}.',
    '{PERSON} lavora presso {ORGANIZATION}.',
    'Il contratto è firmato da {PERSON} per conto di {ORGANIZATION}.',
    "Si prega di contattare {PERSON}, responsabile dell'ufficio di {LOCATION}.",
    'La dottoressa {PERSON} ha visitato il paziente a {LOCATION}.',
    "L'avvocato {PERSON} rappresenta {ORGANIZATION} nella causa.",
    '{ORGANIZATION} ha assunto {PERSON} come consulente.',
  ],
  first: ['Mario', 'Giulia', 'Luca', 'Francesca', 'Alessandro', 'Chiara', 'Marco', 'Sara', 'Giovanni', 'Elena', 'Paolo', 'Martina', 'Stefano', 'Laura', 'Andrea', 'Valentina', 'Roberto', 'Silvia', 'Davide', 'Federica'],
  last: ['Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri'],
  LOCATION: ['Milano', 'Roma', 'Torino', 'Napoli', 'Bologna', 'Firenze', 'Genova', 'Venezia', 'Verona', 'Bari', 'Palermo', 'Trieste', 'Padova', 'Brescia', 'Parma'],
  ORGANIZATION: ['Acme Logistica S.p.A.', 'Globex Italia S.r.l.', 'Initech Servizi S.r.l.', 'Umbra Costruzioni S.p.A.', 'Fondazione Aurora', 'Banca Alpina S.p.A.', 'Studio Legale Ferri', 'Tecnomeccanica Padana S.r.l.'],
};

const EN: LanguagePack = {
  templates: [
    'Mr. {PERSON} has lived in {LOCATION} since 2019.',
    '{ORGANIZATION} is headquartered in {LOCATION}.',
    '{PERSON} works for {ORGANIZATION}.',
    'The agreement was signed by {PERSON} on behalf of {ORGANIZATION}.',
    'Please contact {PERSON}, head of the {LOCATION} office.',
    'Dr. {PERSON} examined the patient in {LOCATION}.',
    'Attorney {PERSON} represents {ORGANIZATION} in the case.',
    '{ORGANIZATION} hired {PERSON} as a consultant.',
  ],
  first: ['James', 'Emily', 'Oliver', 'Sophie', 'William', 'Charlotte', 'Harry', 'Amelia', 'George', 'Olivia', 'Thomas', 'Grace', 'Daniel', 'Jessica', 'Michael', 'Hannah'],
  last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Taylor', 'Davies', 'Evans', 'Wilson', 'Thompson', 'Walker', 'Wright', 'Robinson', 'Clarke', 'Hughes', 'Edwards', 'Turner'],
  LOCATION: ['London', 'Manchester', 'Leeds', 'Bristol', 'Edinburgh', 'Liverpool', 'Oxford', 'Cambridge', 'Dublin', 'Birmingham', 'Glasgow', 'Cardiff'],
  ORGANIZATION: ['Globex Corporation', 'Initech Ltd.', 'Acme Holdings Ltd.', 'Umbrella Consulting Group', 'Northwind Traders', 'Contoso Pharmaceuticals', 'Blue Harbor Bank', 'Stark Engineering Ltd.'],
};

const SLOT = /\{(PERSON|LOCATION|ORGANIZATION)\}/g;

const fill = (pack: LanguagePack, template: string, random: () => number): CorpusSentence => {
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  const entities: LabelledEntity[] = [];
  let text = '';
  let last = 0;
  for (const match of template.matchAll(SLOT)) {
    text += template.slice(last, match.index);
    const category = match[1] as EvalCategory;
    const value = category === 'PERSON' ? `${pick(pack.first)} ${pick(pack.last)}` : pick(pack[category]);
    entities.push({ start: text.length, end: text.length + value.length, category });
    text += value;
    last = match.index + match[0].length;
  }
  return { text: text + template.slice(last), entities };
};

export const buildCorpus = (language: 'it' | 'en', count: number, seed: number): CorpusSentence[] => {
  const pack = language === 'it' ? IT : EN;
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => fill(pack, pack.templates[i % pack.templates.length] ?? '', random));
};

const main = (): void => {
  mkdirSync('tools/ner-eval/corpus', { recursive: true });
  for (const [language, seed] of [['it', 11], ['en', 23]] as const) {
    const lines = buildCorpus(language, 160, seed).map((s) => JSON.stringify(s));
    writeFileSync(`tools/ner-eval/corpus/${language}.jsonl`, `${lines.join('\n')}\n`);
  }
  console.log('ner-eval: corpus written');
};

if (process.argv[1]?.endsWith('corpus-builder.ts')) main();
