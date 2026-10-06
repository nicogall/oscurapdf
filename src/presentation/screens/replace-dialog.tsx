import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../confirm-dialog';

interface ReplaceDialogProps {
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** Asked before a new file replaces the open document. Keeping the document is the default. */
export const ReplaceDialog = ({ onConfirm, onCancel }: ReplaceDialogProps): ReactElement => {
  const { t } = useTranslation();
  return <ConfirmDialog message={t('replace.confirm')} confirmLabel={t('replace.yes')} cancelLabel={t('replace.no')} onConfirm={onConfirm} onCancel={onCancel} />;
};
