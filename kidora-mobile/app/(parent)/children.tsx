import { FlatList } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Avatar, EmptyState, ErrorState, ListRow, SkeletonList } from '@/components/ui';
import { useParentChildren } from '@/hooks/parent';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { spacing } from '@/theme';

export default function Children() {
  const { t } = useT();
  const q = useParentChildren();
  return (
    <Screen scroll={false} testID="parent-children">
      <ScreenHeader title={t('nav.children')} />
      {q.isLoading ? (
        <SkeletonList rows={3} />
      ) : q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: spacing.sm }}
          ListEmptyComponent={<EmptyState emoji="👪" title={t('parent.dashboard.noChildren')} body={t('parent.dashboard.noChildrenBody')} />}
          renderItem={({ item }) => (
            <ListRow
              title={item.displayName ?? item.name}
              subtitle={[item.grade, item.className, item.schoolName].filter(Boolean).join(' · ')}
              left={<Avatar name={item.name} uri={item.avatarUrl} color={item.avatarColor} size={48} />}
              onPress={() => go(`/(parent)/child/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}
