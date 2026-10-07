import { FlatList, View } from 'react-native';

import { IslandCard } from '@/components/game';
import { Screen, ScreenHeader } from '@/components/layout';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useIslands } from '@/hooks/game';
import { useResponsive } from '@/hooks/useResponsive';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { spacing } from '@/theme';

export default function Islands() {
  const { t } = useT();
  const { isTablet } = useResponsive();
  const q = useIslands();
  const columns = isTablet ? 2 : 1;

  return (
    <Screen tone="playful" scroll={false} testID="islands-screen">
      <ScreenHeader title={t('student.islands.title')} subtitle={t('student.islands.subtitle')} />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState emoji="🗺️" title={t('student.islands.emptyIsland')} body={t('student.islands.emptyIslandBody')} />
      ) : (
        <FlatList
          key={columns}
          data={q.data}
          numColumns={columns}
          keyExtractor={(i) => i.key}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
          columnWrapperStyle={columns > 1 ? { gap: spacing.lg } : undefined}
          contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing['4xl'] }}
          renderItem={({ item, index }) => (
            <View style={{ flex: 1 }}>
              <IslandCard island={item} index={index} onPress={(i) => go(`/(student)/island/${i.key}`)} />
            </View>
          )}
        />
      )}
    </Screen>
  );
}
