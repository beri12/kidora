import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, IconButton, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { dayPart } from '@/lib/greeting';
import { go } from '@/lib/navigation';
import { colors, radius, spacing } from '@/theme';
import type { StudentDashboard } from '@/types';
import { firstName, formatNumber } from '@/utils/format';

function StudentHeaderBase({ profile, unread }: { profile: StudentDashboard['profile']; unread: number }) {
  const { t, locale } = useT();
  const name = profile.displayName || firstName(profile.name);
  return (
    <View style={styles.row}>
      <Avatar name={name} uri={profile.avatarUrl} color={profile.avatarColor} size={56} ring={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text variant="h2" numberOfLines={2} accessibilityRole="header" testID="student-welcome">
          {t('student.dashboard.welcome', { dayPart: t(`student.dashboard.dayPart.${dayPart()}`), name })}
        </Text>
        <View style={styles.chips}>
          <View style={styles.chip} accessible accessibilityLabel={t('student.dashboard.streak', { count: profile.streak })}>
            <Text variant="label">{`🔥 ${profile.streak}`}</Text>
          </View>
          <View style={styles.chip} accessible accessibilityLabel={t('common.coins', { coins: profile.coins })}>
            <Text variant="label">{`🪙 ${formatNumber(profile.coins, locale)}`}</Text>
          </View>
        </View>
      </View>
      <View>
        <IconButton icon="notifications" label={t('common.notifications')} onPress={() => go('/(student)/notifications')} />
        {unread > 0 ? <View style={styles.dot} accessibilityElementsHidden /> : null}
      </View>
    </View>
  );
}

export const StudentHeader = memo(StudentHeaderBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  chip: { backgroundColor: colors.surface, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  dot: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.secondary },
});
