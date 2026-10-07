import { useState } from 'react';
import { FlatList } from 'react-native';

import { LeaderboardRow } from '@/components/game';
import { Screen, ScreenHeader } from '@/components/layout';
import { EmptyState, ErrorState, SegmentedControl, SkeletonList, Text } from '@/components/ui';
import { useLeaderboard } from '@/hooks/student';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';
import type { LeaderboardPeriod, LeaderboardScope } from '@/types';

export default function Leaderboard() {
  const { t } = useT();
  const [scope, setScope] = useState<LeaderboardScope>('class');
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const q = useLeaderboard(scope, period);

  return (
    <Screen tone="playful" scroll={false} testID="leaderboard-screen">
      <ScreenHeader title={t('student.leaderboard.title')} back />
      <SegmentedControl
        value={scope}
        onChange={setScope}
        segments={[
          { value: 'class', label: t('student.leaderboard.class') },
          { value: 'school', label: t('student.leaderboard.school') },
          { value: 'global', label: t('student.leaderboard.global') },
        ]}
      />
      {scope !== 'global' ? (
        <SegmentedControl
          value={period}
          onChange={setPeriod}
          segments={[
            { value: 'week', label: t('student.leaderboard.week') },
            { value: 'month', label: t('student.leaderboard.month') },
          ]}
        />
      ) : null}
      <Text variant="tiny" color="textMuted">
        {`🔒 ${t('student.leaderboard.privacy')}`}
      </Text>
      {q.isLoading ? (
        <SkeletonList rows={6} />
      ) : q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(e) => `${e.rank}-${e.userId}`}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing['4xl'] }}
          ListEmptyComponent={<EmptyState emoji="🏁" title={t('student.leaderboard.empty')} />}
          renderItem={({ item }) => <LeaderboardRow entry={item} xpIsTotal={scope === 'global'} />}
          initialNumToRender={12}
          windowSize={7}
        />
      )}
    </Screen>
  );
}
