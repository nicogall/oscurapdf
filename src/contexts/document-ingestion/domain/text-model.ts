import { normalizeText, type CharRange, type NormalizedText, type PageArea, type PageIndex } from '@shared-kernel';
import { buildAreas } from './area-builder';
import { findOccurrences } from './occurrence-finder';
import type { PageText } from './page-text';
import { buildTextAndSpans } from './text-model-builder';
import type { TextSpan } from './text-span';

/** Read-only view of the canonical text shared by detection, selection and redaction. */
export interface TextModelView {
  readonly text: string;
  readonly spans: readonly TextSpan[];
  occurrencesOf(needle: string): CharRange[];
  areasFor(range: CharRange): PageArea[];
  pageOf(range: CharRange): PageIndex | undefined;
}

/** The document's canonical text (constitution IV: one text model). */
export class TextModel implements TextModelView {
  private normalized: NormalizedText | undefined;

  private constructor(
    readonly text: string,
    readonly spans: readonly TextSpan[],
  ) {}

  static build(pages: readonly PageText[]): TextModel {
    const { text, spans } = buildTextAndSpans(pages);
    return new TextModel(text, spans);
  }

  occurrencesOf(needle: string): CharRange[] {
    this.normalized ??= normalizeText(this.text);
    return findOccurrences(this.normalized, needle);
  }

  areasFor(range: CharRange): PageArea[] {
    return buildAreas(this.spans, range);
  }

  pageOf(range: CharRange): PageIndex | undefined {
    return this.spans.find((span) => span.range.end > range.start && span.range.start < range.end)?.page;
  }
}
