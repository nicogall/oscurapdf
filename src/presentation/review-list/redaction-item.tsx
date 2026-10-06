import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { Redaction, RedactionId } from '@app/views';
import { CategoryBadge } from './category-badge';
import { ConfidenceBadge } from './confidence-badge';
import { redactionLabel } from './redaction-label';

export interface RedactionItemActions {
  readonly onSelect: (id: RedactionId) => void;
  readonly onDeselect: (id: RedactionId) => void;
  readonly onDelete: (id: RedactionId) => void;
  readonly onNavigate: (item: Redaction, occurrence: number) => void;
}

/** One list entry: checkbox, label, badge, occurrence count; click navigates and cycles (ui-contract). */
export const RedactionItem = ({ item, actions }: { item: Redaction; actions: RedactionItemActions }): ReactElement => {
  const { t } = useTranslation();
  const [next, setNext] = useState(0);
  const label = redactionLabel(item, t);
  const navigate = () => {
    actions.onNavigate(item, next % item.occurrences.length);
    setNext(next + 1);
  };
  return (
    <li className={`redaction-item redaction-item--${item.source}${item.confidence !== 'high' && item.source === 'automatic' ? ' redaction-item--suggestion' : ''}`}>
      <input
        type="checkbox"
        checked={item.selected}
        aria-label={t('review.itemLabel', { label })}
        onChange={() => {
          (item.selected ? actions.onDeselect : actions.onSelect)(item.id);
        }}
      />
      <button type="button" className="redaction-item__label" onClick={navigate}>
        {label}
      </button>
      <CategoryBadge category={item.category} />
      {item.confidence !== 'userConfirmed' && <ConfidenceBadge confidence={item.confidence} />}
      {item.occurrences.length > 1 && <span className="redaction-item__count">{t('review.occurrences', { count: item.occurrences.length })}</span>}
      {item.source === 'manual' && (
        <button type="button" className="link" aria-label={t('review.removeItem', { label })} onClick={() => { actions.onDelete(item.id); }}>
          {t('review.remove')}
        </button>
      )}
    </li>
  );
};
