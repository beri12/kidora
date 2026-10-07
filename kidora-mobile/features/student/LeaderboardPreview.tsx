import { memo } from 'react';
import { View } from 'react-native';

import { LeaderboardRow } from '@/components/game';
import { SectionHeader, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { spacing } from '@/theme';
import type { LeaderboardEntry } from '@/types';

function LeaderboardPreviewBase({ entries }: { entries: LeaderboardEntry[] }) {
  const { t } = useT();
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title={t('student.dashboard.leaderboard')} onSeeAll={() => go('/(student)/leaderboard')} />
      {entries.length ? (
        entries.slice(0, 3).map((e) => <LeaderboardRow key={e.userId} entry={e} />)
      ) : (
        <Text color="textMuted">{t('student.leaderboard.empty')}</Text>
      )}
    </View>
  );
}

export const LeaderboardPreview = memo(LeaderboardPreviewBase);
