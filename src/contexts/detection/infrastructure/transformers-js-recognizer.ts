import { aggregateEntities, type TokenLabel } from './bio-aggregation';
import type { ModelRecognizer } from './ensemble-recognizer';
import { joinAdjacent, mapLabels, type LabelMap, type ModelEntity } from './label-mapping';
import { toModelCasing } from './model-casing';
import { chunkText, type TextChunk } from '../domain/text-chunking';
import { alignTokens, wordStarts } from './token-alignment';

/** The slice of a Transformers.js token-classification pipeline this adapter uses. */
export interface TokenClassifier {
  (text: string): Promise<ReadonlyArray<{ entity: string; score: number; index: number }>>;
  readonly tokenizer: { tokenize(text: string): string[] };
}

export type ClassifierLoader = (modelId: string) => Promise<TokenClassifier>;

const shift = (entity: ModelEntity, offset: number): ModelEntity => ({
  ...entity,
  range: { start: entity.range.start + offset, end: entity.range.end + offset },
});

/** Entities seen twice in the one-line overlap between chunks are kept once. */
const dedupe = (entities: readonly ModelEntity[]): ModelEntity[] =>
  entities.filter((e, i) => entities.findIndex((o) => o.category === e.category && o.range.start === e.range.start && o.range.end === e.range.end) === i);

/** One NER model on-device. Text is re-cased for the model, chunked, and aligned back to offsets. */
export class TransformersJsRecognizer implements ModelRecognizer {
  constructor(
    readonly id: string,
    private readonly labels: LabelMap,
    private readonly load: ClassifierLoader,
  ) {}

  async recognize(text: string, progress?: (fraction: number) => void): Promise<ModelEntity[]> {
    const classify = await this.load(this.id);
    const chunks = chunkText(toModelCasing(text));
    const entities: ModelEntity[] = [];
    for (const [i, chunk] of chunks.entries()) {
      entities.push(...(await this.recognizeChunk(classify, chunk)));
      progress?.((i + 1) / chunks.length);
    }
    return dedupe(entities);
  }

  private async recognizeChunk(classify: TokenClassifier, chunk: TextChunk): Promise<ModelEntity[]> {
    if (chunk.text.trim().length === 0) return [];
    const tokens = classify.tokenizer.tokenize(chunk.text);
    const raw = await classify(chunk.text);
    const labels: TokenLabel[] = raw.map((t) => ({ index: t.index, label: t.entity, score: t.score }));
    const spans = aggregateEntities(labels, alignTokens(chunk.text, tokens), wordStarts(tokens));
    return joinAdjacent(mapLabels(spans, this.labels), chunk.text).map((entity) => shift(entity, chunk.start));
  }
}
