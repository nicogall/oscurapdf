import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentWorkspace, Page, Redaction, ReviewSnapshot, SessionState, UnreadableText } from '@app/views';
import { ExportScreens } from '../export/export-screens';
import { formatSize } from '../format-size';
import { ReviewList } from '../review-list/review-list';
import { DetectionStatus } from './detection-status';
import { NotCheckedPagesBanner } from './not-checked-pages-banner';
import { ReviewToolbar } from './review-toolbar';
import { useUndoRedoShortcuts } from '../use-undo-redo-shortcuts';
import { useObservable } from '../use-observable';
import { DocumentViewer } from '../viewer/document-viewer';
import { AreaTool, type DrawnArea } from '../viewer/area-tool';
import { RedactionOverlays, type FocusedOccurrence } from '../viewer/redaction-overlays';
import { SelectionToRedact } from '../viewer/selection-to-redact';
import { UnreadableZones } from '../viewer/unreadable-zones';
import { ToolSwitch, type ToolMode } from '../viewer/tool-switch';

type Reviewing = Extract<SessionState, { kind: 'reviewing' }>;

const scrollToPage = (page: number): void => {
  document.querySelector(`[data-page-index="${page}"]`)?.scrollIntoView({ block: 'center' });
};

const useReviewActions = (workspace: DocumentWorkspace, focus: (f: FocusedOccurrence) => void) => {
  const { review } = workspace;
  return {
    onSelect: (id: Redaction['id']) => { review.select(id); },
    onDeselect: (id: Redaction['id']) => { review.deselect(id); },
    onDelete: (id: Redaction['id']) => void review.delete(id),
    onSelectAll: () => { review.selectAll(); },
    onDeselectAll: () => { review.deselectAll(); },
    onNavigate: (item: Redaction, occurrence: number) => {
      const page = item.occurrences[occurrence]?.areas[0]?.page;
      if (page !== undefined) scrollToPage(page);
      focus({ id: item.id, occurrence });
    },
  };
};

interface PageLayersProps {
  readonly page: Page;
  readonly scale: number;
  readonly snapshot: ReviewSnapshot;
  readonly focused: FocusedOccurrence | undefined;
  readonly mode: ToolMode;
  readonly workspace: DocumentWorkspace;
  readonly unreadable: UnreadableText;
}

/** The X on a black box: a manual item is deleted, an automatic one is only deselected (undoable). */
const removeFromRedaction = (workspace: DocumentWorkspace, item: Redaction): void => {
  if (item.source === 'manual') void workspace.review.delete(item.id);
  else workspace.review.deselect(item.id);
};

/** Everything drawn over one page: redaction overlays, unreadable zones (FR-037), and the area tool in draw mode. */
const PageLayers = ({ page, scale, snapshot, focused, mode, workspace, unreadable }: PageLayersProps): ReactElement => {
  const addArea = (area: DrawnArea) => void workspace.review.addManualArea({ page: page.index, box: area.box }, page.size);
  return (
    <>
      <RedactionOverlays
        page={page.index}
        scale={scale}
        items={snapshot.items}
        focused={focused}
        // In draw mode the pointer belongs to the area tool.
        onRemove={mode === 'select' ? (item) => { removeFromRedaction(workspace, item); } : undefined}
      />
      {mode === 'select' && <UnreadableZones page={page.index} pageSize={page.size} scale={scale} zones={unreadable.zones} onArea={addArea} />}
      {mode === 'draw' && <AreaTool page={page.index} pageSize={page.size} scale={scale} onArea={addArea} />}
    </>
  );
};

/** Review screen: file info, review list, Redact & Export, and the viewer with overlays. */
export const ReviewingScreen = ({ state }: { state: Reviewing }): ReactElement => {
  const { t, i18n } = useTranslation();
  const { review, exportFlow, detection } = state.workspace;
  const snapshot = useObservable((l) => review.store.subscribe(l), () => review.store.snapshot());
  const exportState = useObservable((l) => exportFlow.store.subscribe(l), () => exportFlow.store.get());
  const detectionStatus = useObservable((l) => detection.status.subscribe(l), () => detection.status.get());
  const [focused, setFocused] = useState<FocusedOccurrence | undefined>(undefined);
  const [mode, setMode] = useState<ToolMode>('select');
  const actions = useReviewActions(state.workspace, setFocused);
  const nothingSelected = snapshot.summary.selected === 0;
  useUndoRedoShortcuts(review.history, exportState.kind === 'idle');

  if (exportState.kind !== 'idle') return <ExportScreens state={exportState} flow={exportFlow} />;
  return (
    <section className="reviewing">
      <aside className="reviewing__panel">
        <ReviewToolbar
          fileInfo={t('review.fileInfo', { name: state.document.fileName, size: formatSize(state.document.byteSize, i18n.language) })}
          history={review.history}
          state={snapshot.history}
        />
        <ToolSwitch mode={mode} onChange={setMode} />
        {mode === 'draw' && <p className="hint">{t('tools.drawHint')}</p>}
        <NotCheckedPagesBanner pages={state.pagesWithoutText} unreadablePages={state.unreadableText.pages} />
        <DetectionStatus status={detectionStatus} />
        <ReviewList snapshot={snapshot} actions={actions} />
        <button type="button" className="primary" disabled={nothingSelected} onClick={() => void exportFlow.start()}>
          {t('review.redactExport')}
        </button>
        {nothingSelected && <p className="hint">{t('review.nothingSelected')}</p>}
      </aside>
      <SelectionToRedact onRedact={(range) => void review.addManualText(range)}>
        <DocumentViewer
          pages={state.document.pages}
          textModel={state.textModel}
          overlay={(page, scale) => <PageLayers page={page} scale={scale} snapshot={snapshot} focused={focused} mode={mode} workspace={state.workspace} unreadable={state.unreadableText} />}
        />
      </SelectionToRedact>
    </section>
  );
};
