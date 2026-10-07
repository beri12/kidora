import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useT } from '@/hooks/useT';
import { colors, radius, spacing } from '@/theme';
import type { StreakDay } from '@/types';

function StreakWeekBase({ days, streak }: { days: StreakDay[]; streak: number }) {
  const { t } = useT();
  return (
    <View style={styles.wrap} accessible accessibilityLabel={t('student.dashboard.streak', { count: streak })}>
      <View style={styles.head}>
        <Text style={styles.flame}>🔥</Text>
        <Text variant="h3">{t('student.dashboard.streak', { count: streak })}</Text>
      </View>
      <View style={styles.row}>
        {days.map((d) => (
          <View key={d.date} style={styles.day}>
            <View style={[styles.dot, d.done && styles.done, d.isToday && styles.today]}>{d.done ? <Text variant="tiny" color="textInverse">✓</Text> : null}</View>
            <Text variant="tiny" color={d.isToday ? 'text' : 'textMuted'}>
              {d.day}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const StreakWeek = memo(StreakWeekBase);

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flame: { fontSize: 24, lineHeight: 30 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: spacing.xs },
  dot: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: colors.streak },
  today: { borderWidth: 2, borderColor: colors.streak },
});
