import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReviewSnapshot } from '@app/views';
import { CloseDocumentDialog } from './close-document-dialog';
import { Icon } from '../icons';
import { isApplePlatform, shortcutLabels } from '../platform';
import type { UndoRedo } from '../use-undo-redo-shortcuts';

interface ReviewToolbarProps {
  readonly fileInfo: string;
  readonly history: UndoRedo;
  readonly state: ReviewSnapshot['history'];
}

const HistoryButtons = ({ history, state }: Omit<ReviewToolbarProps, 'fileInfo'>): ReactElement => {
  const { t } = useTranslation();
  const apple = isApplePlatform();
  const keys = shortcutLabels(apple);
  const button = (command: 'undo' | 'redo', enabled: boolean, aria: string) => (
    <button
      type="button"
      className="icon-button"
      disabled={!enabled}
      onClick={() => void history[command]()}
      title={t('review.shortcut', { action: t(`review.${command}`), keys: keys[command] })}
      aria-label={t(`review.${command}`)}
      aria-keyshortcuts={aria}
    >
      <Icon name={command} className="icon icon--sm" />
    </button>
  );
  return (
    <>
      {button('undo', state.canUndo, apple ? 'Meta+Z' : 'Control+Z')}
      {button('redo', state.canRedo, apple ? 'Meta+Shift+Z' : 'Control+Y')}
    </>
  );
};

/** File name, undo / redo, and the X that closes the document after confirmation. */
export const ReviewToolbar = ({ fileInfo, history, state }: ReviewToolbarProps): ReactElement => {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="review-toolbar">
      <p className="review-toolbar__file">{fileInfo}</p>
      <HistoryButtons history={history} state={state} />
      <button type="button" className="icon-button icon-button--close" aria-label={t('review.close')} title={t('review.close')} onClick={() => { setConfirming(true); }}>
        <Icon name="cross" className="icon icon--sm" />
      </button>
      {confirming && <CloseDocumentDialog onCancel={() => { setConfirming(false); }} />}
    </div>
  );
};
