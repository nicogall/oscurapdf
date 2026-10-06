import { useEffect, useId, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Confirmation built into the page (no window.confirm). The safe choice has focus; Esc cancels.
 * Rendered into <body> so no stacking context (e.g. the sticky review panel) can cover it.
 */
export const ConfirmDialog = ({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps): ReactElement => {
  const textId = useId();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);
  return createPortal(
    <>
      <div className="dialog-backdrop" onClick={onCancel} aria-hidden="true" />
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={textId}>
        <p id={textId}>{message}</p>
        <div className="dialog__actions">
          <button type="button" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className="danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
};
