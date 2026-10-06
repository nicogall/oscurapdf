/**
 * Downloads the pinned NER model files into public/models/<id>/ and verifies SHA-256
 * (research R4), from the Hugging Face Hub or from the release that publishes them. The app itself
 * never contacts either at runtime (constitution I).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export interface LockedFile {
  path: string;
  sha256: string;
  size: number;
}
export interface LockedModel {
  id: string;
  commit: string;
  /**
   * Where the files are published when not on the Hugging Face Hub: a folder of flat files, such as
   * the assets of a GitHub release (each file is fetched by its base name).
   */
  baseUrl?: string;
  files: LockedFile[];
}

const MODELS_DIR = 'public/models';

/** The commit is pinned in the lock file; the folder omits it because Transformers.js cannot load paths containing '@'. */
export const modelDir = (model: LockedModel): string => join(MODELS_DIR, model.id);

export const sha256 = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');

export const isValid = (data: Uint8Array, file: LockedFile): boolean =>
  data.byteLength === file.size && sha256(data) === file.sha256;

export const fileUrl = (model: LockedModel, file: LockedFile): string =>
  model.baseUrl === undefined
    ? `https://huggingface.co/${model.id}/resolve/${model.commit}/${file.path}`
    : `${model.baseUrl}/${basename(file.path)}`;

const download = async (model: LockedModel, file: LockedFile): Promise<Uint8Array> => {
  const url = fileUrl(model, file);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`fetch-models: HTTP ${response.status} for ${url}`);
  return new Uint8Array(await response.arrayBuffer());
};

const ensureFile = async (model: LockedModel, file: LockedFile): Promise<void> => {
  const target = join(modelDir(model), file.path);
  if (existsSync(target) && isValid(readFileSync(target), file)) return;
  const data = await download(model, file);
  if (!isValid(data, file)) throw new Error(`fetch-models: checksum mismatch for ${model.id}/${file.path}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  console.log(`fetch-models: ${model.id}/${file.path} ok`);
};

const main = async (): Promise<void> => {
  const lock = JSON.parse(readFileSync('tools/fetch-models/models.lock.json', 'utf8')) as { models: LockedModel[] };
  for (const model of lock.models) {
    for (const file of model.files) await ensureFile(model, file);
  }
};

if (process.argv[1]?.endsWith('fetch.ts')) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
