import { FlatList } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { ClassCard } from '@/features/dashboard';
import { useTeacherClasses } from '@/hooks/teacher';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { spacing } from '@/theme';

export default function TeacherClasses() {
  const { t } = useT();
  const q = useTeacherClasses();
  return (
    <Screen scroll={false} testID="teacher-classes">
      <ScreenHeader title={t('nav.classes')} />
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
          ListEmptyComponent={<EmptyState emoji="🏫" title={t('teacher.dashboard.noClasses')} body={t('teacher.dashboard.noClassesBody')} />}
          renderItem={({ item }) => <ClassCard cls={item} onPress={() => go(`/(teacher)/class/${item.id}`)} />}
        />
      )}
    </Screen>
  );
}
