import { memo } from 'react';

import { Avatar, ListRow, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import type { ActivityItem } from '@/types';
import { formatDate } from '@/utils/format';

function ActivityFeedBase({ items }: { items: ActivityItem[] }) {
  const { t, locale } = useT();
  if (!items.length) return <Text color="textMuted">{t('parent.child.noActivity')}</Text>;
  return (
    <>
      {items.map((a) => (
        <ListRow
          key={a.id}
          title={a.title}
          subtitle={[a.actor?.name, formatDate(a.createdAt, locale)].filter(Boolean).join(' · ')}
          left={<Avatar name={a.actor?.name} uri={a.actor?.avatarUrl} size={36} />}
          right={a.xpDelta ? <Text variant="label" color="warning">{`+${a.xpDelta} XP`}</Text> : undefined}
        />
      ))}
    </>
  );
}

export const ActivityFeed = memo(ActivityFeedBase);
