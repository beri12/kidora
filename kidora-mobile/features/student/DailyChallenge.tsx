import { memo } from 'react';
import { View } from 'react-native';

import { QuestCard } from '@/components/game';
import { SectionHeader } from '@/components/ui';
import { useClaimQuest } from '@/hooks/student';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';
import type { Quest } from '@/types';

function DailyChallengeBase({ quest }: { quest: Quest | null }) {
  const { t } = useT();
  const claim = useClaimQuest();
  if (!quest) return null;
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={t('student.dashboard.dailyChallenge')} />
      <QuestCard quest={quest} onClaim={(q) => claim.mutate(q.id)} claiming={claim.isPending} />
    </View>
  );
}

export const DailyChallenge = memo(DailyChallengeBase);
