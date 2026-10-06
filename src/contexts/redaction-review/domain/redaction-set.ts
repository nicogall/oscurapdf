import { err, newEntityId, ok, type CharRange, type PageArea, type Result } from '@shared-kernel';
import type { ConfidenceLevel, PiiCategory } from '@shared-kernel/published';
import { validateArea, type PageSize } from './area-validation';
import { applyChanges, type ChangeSet, type HistoryDirection } from './change-set';
import type { DocumentText } from './document-text';
import type { Redaction, RedactionId } from './redaction';
import { mergeAutomatic, newAutomaticText, newManualText, trimSelection, upgradeToManual, type TextSelection } from './text-redaction';

export type ReviewMode = 'editing' | 'exporting';
export type ReviewError = 'readOnly' | 'blankSelection' | 'notFound' | 'notManual' | 'invalidArea';

export interface AutomaticInput {
  readonly range: CharRange;
  readonly category: PiiCategory;
  readonly confidence: ConfidenceLevel;
}

/**
 * Aggregate root of Redaction Review: one per document.
 * Invariants: one redaction per normalized text; occurrences are all whole-word, case-insensitive
 * occurrences; only manual redactions can be deleted; area redactions never merge;
 * read-only while exporting.
 */
export class RedactionSet {
  private readonly redactions = new Map<RedactionId, Redaction>();
  private mode: ReviewMode = 'editing';

  constructor(private readonly doc: DocumentText) {}

  items(): readonly Redaction[] {
    return [...this.redactions.values()];
  }

  setMode(mode: ReviewMode): void {
    this.mode = mode;
  }

  addManualText(range: CharRange): Result<RedactionId, ReviewError> {
    return this.addText(range, (selection, existing) =>
      existing ? upgradeToManual(this.doc, existing, selection) : newManualText(this.doc, selection),
    );
  }

  addAutomatic(input: AutomaticInput): Result<RedactionId, ReviewError> {
    return this.addText(input.range, (selection, existing) =>
      existing ? mergeAutomatic(existing, input.confidence) : newAutomaticText(this.doc, selection, input),
    );
  }

  /** A drawn rectangle (US3); it must lie within its page. Area redactions never merge. */
  addManualArea(area: PageArea, page: PageSize): Result<RedactionId, ReviewError> {
    if (this.mode === 'exporting') return err('readOnly');
    if (!validateArea(area, page).ok) return err('invalidArea');
    const redaction: Redaction = {
      id: newEntityId<'Redaction'>(),
      kind: 'area',
      occurrences: [{ areas: [area] }],
      category: 'MANUAL',
      source: 'manual',
      confidence: 'userConfirmed',
      selected: true,
    };
    this.redactions.set(redaction.id, redaction);
    return ok(redaction.id);
  }

  /** Selecting an item that already has that state changes nothing (no new value). */
  setSelected(id: RedactionId, selected: boolean): void {
    this.update(id, (r) => (r.selected === selected ? r : { ...r, selected }));
  }

  setAllSelected(selected: boolean): void {
    for (const id of this.redactions.keys()) this.setSelected(id, selected);
  }

  /** Undo / redo of a recorded user command (items changed since by others are left alone). */
  revert(changes: ChangeSet, direction: HistoryDirection): Result<void, ReviewError> {
    if (this.mode === 'exporting') return err('readOnly');
    const next = applyChanges(this.items(), changes, direction);
    this.redactions.clear();
    for (const redaction of next) this.redactions.set(redaction.id, redaction);
    return ok(undefined);
  }

  delete(id: RedactionId): Result<void, ReviewError> {
    if (this.mode === 'exporting') return err('readOnly');
    const redaction = this.redactions.get(id);
    if (redaction === undefined) return err('notFound');
    if (redaction.source !== 'manual') return err('notManual');
    this.redactions.delete(id);
    return ok(undefined);
  }

  private addText(
    range: CharRange,
    build: (selection: TextSelection, existing: Redaction | undefined) => Redaction,
  ): Result<RedactionId, ReviewError> {
    if (this.mode === 'exporting') return err('readOnly');
    const selection = trimSelection(this.doc, range);
    if (selection === undefined) return err('blankSelection');
    const existing = this.items().find((r) => r.key === selection.key);
    const redaction = build(selection, existing);
    this.redactions.set(redaction.id, redaction);
    return ok(redaction.id);
  }

  private update(id: RedactionId, change: (redaction: Redaction) => Redaction): void {
    const redaction = this.redactions.get(id);
    if (redaction === undefined || this.mode === 'exporting') return;
    this.redactions.set(id, change(redaction));
  }
}
