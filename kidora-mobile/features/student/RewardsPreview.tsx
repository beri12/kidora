import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { colors, spacing } from '@/theme';
import { formatNumber } from '@/utils/format';

function RewardsPreviewBase({ coins }: { coins: number }) {
  const { t, locale } = useT();
  return (
    <Card tone="tinted" tint={colors.accentSoft} style={styles.card}>
      <Text style={styles.emoji}>🎁</Text>
      <View style={{ flex: 1 }}>
        <Text variant="h3">{t('student.dashboard.rewards')}</Text>
        <Text color="textMuted">{`🪙 ${formatNumber(coins, locale)}`}</Text>
      </View>
      <Button label={t('common.seeAll')} size="sm" variant="secondary" onPress={() => go('/(student)/rewards')} />
    </Card>
  );
}

export const RewardsPreview = memo(RewardsPreviewBase);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 36, lineHeight: 44 },
});
