import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, radius, spacing } from '@/theme';
import type { Reward } from '@/types';

export interface RewardCardProps {
  reward: Reward;
  coins: number;
  onBuy?: (reward: Reward) => void;
  buying?: boolean;
}

const RARITY_TONE = { common: 'neutral', rare: 'info', epic: 'brand', legendary: 'accent' } as const;

function RewardCardBase({ reward, coins, onBuy, buying }: RewardCardProps) {
  const { t } = useT();
  const affordable = coins >= reward.cost;
  return (
    <Card tone="playful" style={styles.card} accessibilityLabel={`${reward.name}, ${t('common.coins', { coins: reward.cost })}`}>
      <View style={styles.art}>
        <Text style={styles.emoji}>🎁</Text>
      </View>
      <Text variant="bodyStrong" numberOfLines={1}>
        {reward.name}
      </Text>
      {reward.rarity ? <Badge label={reward.rarity} tone={RARITY_TONE[reward.rarity]} /> : null}
      {reward.owned ? (
        <Badge label={t('student.rewards.owned')} tone="success" icon="checkmark" />
      ) : (
        <Button
          label={affordable ? t('student.rewards.buy', { cost: reward.cost }) : t('student.rewards.notEnough')}
          size="sm"
          variant={affordable ? 'primary' : 'secondary'}
          disabled={!affordable}
          loading={buying}
          onPress={() => onBuy?.(reward)}
        />
      )}
    </Card>
  );
}

export const RewardCard = memo(RewardCardBase);

const styles = StyleSheet.create({
  card: { flex: 1, gap: spacing.sm, alignItems: 'flex-start', padding: spacing.md },
  art: { alignSelf: 'stretch', height: 72, borderRadius: radius.lg, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 36, lineHeight: 44 },
});
