import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, ProgressBar, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, spacing } from '@/theme';
import type { Quest } from '@/types';

function QuestCardBase({ quest, onClaim, claiming }: { quest: Quest; onClaim?: (q: Quest) => void; claiming?: boolean }) {
  const { t } = useT();
  const ratio = quest.target ? quest.progress / quest.target : 0;
  return (
    <Card tone="playful" style={styles.card} testID={`quest-${quest.id}`}>
      <View style={styles.head}>
        <Text style={styles.emoji}>{quest.kind === 'DAILY' ? '☀️' : quest.kind === 'WEEKLY' ? '🗓️' : '🎯'}</Text>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{quest.title}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {quest.description}
          </Text>
        </View>
      </View>
      <ProgressBar value={ratio} color={colors.accent} accessibilityLabel={t('common.of', { current: quest.progress, total: quest.target })} />
      <View style={styles.foot}>
        <Badge label={t('game.plusXp', { xp: quest.rewardXP })} tone="accent" />
        {quest.rewardCoins ? <Badge label={`🪙 ${quest.rewardCoins}`} tone="warning" /> : null}
        <View style={{ flex: 1 }} />
        {quest.claimed ? (
          <Badge label={t('student.dashboard.claimed')} tone="success" icon="checkmark" />
        ) : quest.completed && onClaim ? (
          <Button label={t('student.dashboard.claim')} size="sm" variant="game" onPress={() => onClaim(quest)} loading={claiming} />
        ) : (
          <Text variant="tiny" color="textMuted">
            {t('common.of', { current: quest.progress, total: quest.target })}
          </Text>
        )}
      </View>
    </Card>
  );
}

export const QuestCard = memo(QuestCardBase);

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  emoji: { fontSize: 32, lineHeight: 40 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
