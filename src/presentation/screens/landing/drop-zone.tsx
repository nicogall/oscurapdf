import { useId, useState, type DragEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../icons';

interface DropZoneProps {
  readonly onFile: (file: File) => void;
}

/** The visible "Choose a PDF" button with its hidden file input. */
const FilePicker = ({ onFile }: DropZoneProps): ReactElement => {
  const { t } = useTranslation();
  const inputId = useId();
  return (
    <>
      <label htmlFor={inputId} className="button button--primary button--lg">
        {t('empty.choose')}
      </label>
      <input
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) onFile(file);
        }}
      />
    </>
  );
};

/** The main call to action: drop a PDF or pick one; highlights while a file is dragged over it. */
export const DropZone = ({ onFile }: DropZoneProps): ReactElement => {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file !== undefined) onFile(file);
  };
  return (
    <div
      className={`drop-zone${dragging ? ' drop-zone--active' : ''}`}
      data-testid="drop-zone"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => {
        setDragging(false);
      }}
      onDrop={onDrop}
    >
      <span className="drop-zone__icon">
        <Icon name="upload" />
      </span>
      <p className="drop-zone__title">{t('empty.drop')}</p>
      <p className="drop-zone__or">{t('empty.or')}</p>
      <FilePicker onFile={onFile} />
      <p className="drop-zone__meta">{t('landing.dropMeta')}</p>
    </div>
  );
};
