import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { Redaction } from '@app/views';
import { RedactionItem, type RedactionItemActions } from './redaction-item';

interface SourceGroupsProps {
  readonly items: readonly Redaction[];
  readonly actions: RedactionItemActions;
}

const Group = ({ title, items, actions }: { title: string; items: readonly Redaction[]; actions: RedactionItemActions }): ReactElement | null =>
  items.length === 0 ? null : (
    <section className="source-group">
      <h3>{title}</h3>
      <ul className="review-list__items">
        {items.map((item) => (
          <RedactionItem key={item.id} item={item} actions={actions} />
        ))}
      </ul>
    </section>
  );

/** "Automatically detected" and "Manually selected" sections of the one list (FR-016). */
export const SourceGroups = ({ items, actions }: SourceGroupsProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <>
      <Group title={t('groups.automatic')} items={items.filter((i) => i.source === 'automatic')} actions={actions} />
      <Group title={t('groups.manual')} items={items.filter((i) => i.source === 'manual')} actions={actions} />
    </>
  );
};
