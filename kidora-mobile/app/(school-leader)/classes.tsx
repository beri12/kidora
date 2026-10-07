import { FlatList } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { ClassCard } from '@/features/dashboard';
import { useSchoolClasses } from '@/hooks/school';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';

export default function SchoolClasses() {
  const { t } = useT();
  const q = useSchoolClasses();
  return (
    <Screen scroll={false} testID="school-classes">
      <ScreenHeader title={t('nav.classes')} back />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(c) => c.id}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing['4xl'] }}
          ListEmptyComponent={<EmptyState emoji="🏫" title={t('analytics.noData')} />}
          renderItem={({ item }) => <ClassCard cls={item} />}
        />
      )}
    </Screen>
  );
}
