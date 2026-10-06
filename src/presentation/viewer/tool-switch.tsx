import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

export type ToolMode = 'select' | 'draw';

interface ToolSwitchProps {
  readonly mode: ToolMode;
  readonly onChange: (mode: ToolMode) => void;
}

/** [Select text] (default) / [Select area] (FR-014). */
export const ToolSwitch = ({ mode, onChange }: ToolSwitchProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="tool-switch" role="group" aria-label={t('tools.label')}>
      <button type="button" aria-pressed={mode === 'select'} onClick={() => { onChange('select'); }}>
        {t('tools.selectText')}
      </button>
      <button type="button" aria-pressed={mode === 'draw'} onClick={() => { onChange('draw'); }}>
        {t('tools.drawArea')}
      </button>
    </div>
  );
};
