import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { levelFromXp } from '@/lib/level';
import { colors, radius, spacing } from '@/theme';
import type { LeaderboardEntry } from '@/types';
import { formatNumber } from '@/utils/format';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** rank · avatar · display name · level · XP. Never a full name (privacy). */
function LeaderboardRowBase({ entry, xpIsTotal = false }: { entry: LeaderboardEntry; xpIsTotal?: boolean }) {
  const { t, locale } = useT();
  const level = entry.level ?? (xpIsTotal ? levelFromXp(entry.xp) : undefined);
  const name = entry.isMe ? `${entry.displayName} (${t('student.leaderboard.you')})` : entry.displayName;
  return (
    <View
      style={[styles.row, entry.isMe && styles.me]}
      accessible
      accessibilityLabel={`#${entry.rank} ${name}, ${t('common.xp', { xp: entry.xp })}${level ? `, ${t('common.level', { level })}` : ''}`}
    >
      <View style={styles.rank}>
        <Text variant="h3">{MEDALS[entry.rank] ?? `${entry.rank}`}</Text>
      </View>
      <Avatar name={entry.displayName} uri={entry.avatarUrl} color={entry.avatarColor} size={40} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        {level ? (
          <Text variant="tiny" color="textMuted">
            {t('common.level', { level })}
          </Text>
        ) : null}
      </View>
      <Text variant="bodyStrong" color="warning">
        {`${formatNumber(entry.xp, locale)} XP`}
      </Text>
    </View>
  );
}

export const LeaderboardRow = memo(LeaderboardRowBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  me: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  rank: { width: 36, alignItems: 'center' },
});
