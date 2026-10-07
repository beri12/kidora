import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Badge, Card, EmptyState, ErrorState, LoadingState, ProgressBar, SegmentedControl, Text } from '@/components/ui';
import { useAchievements, useBadges } from '@/hooks/student';
import { useResponsive } from '@/hooks/useResponsive';
import { useT } from '@/hooks/useT';
import { colors, spacing } from '@/theme';

export default function Achievements() {
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const { t } = useT();
  const { columns } = useResponsive();
  const [tab, setTab] = useState<'achievements' | 'badges'>('achievements');
  const achievements = useAchievements();
  const badges = useBadges();
  const q = tab === 'achievements' ? achievements : badges;

  return (
    <Screen tone="playful" scroll={false} testID="achievements-screen">
      <ScreenHeader title={t('student.achievements.title')} back />
      <SegmentedControl
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'achievements', label: t('student.achievements.title') },
          { value: 'badges', label: t('student.achievements.badges') },
        ]}
      />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : tab === 'achievements' ? (
        <FlatList
          data={achievements.data ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState emoji="🏅" title={t('student.achievements.empty')} />}
          renderItem={({ item }) => {
            const unlocked = !!item.unlockedAt;
            const target = typeof item.requirement === 'number' ? item.requirement : 0;
            return (
              <Card tone="playful" style={[styles.row, item.id === highlight && styles.highlight, !unlocked && { opacity: 0.7 }]} accessibilityLabel={`${item.title}. ${item.description}`}>
                <Text style={styles.emoji}>{unlocked ? '🏅' : '🔒'}</Text>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="bodyStrong">{item.title}</Text>
                  <Text variant="caption" color="textMuted">
                    {item.description}
                  </Text>
                  {unlocked ? (
                    <Badge label={t('student.achievements.unlocked')} tone="success" icon="checkmark" />
                  ) : target ? (
                    <ProgressBar value={item.progress / target} color={colors.accent} height={6} />
                  ) : (
                    <Text variant="tiny" color="textSubtle">
                      {t('student.achievements.lockedHint')}
                    </Text>
                  )}
                </View>
                <Badge label={t('game.plusXp', { xp: item.xpReward })} tone="accent" />
              </Card>
            );
          }}
        />
      ) : (
        <FlatList
          key={columns}
          data={badges.data ?? []}
          keyExtractor={(b) => b.id}
          numColumns={columns}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState emoji="🎖️" title={t('student.achievements.empty')} />}
          renderItem={({ item }) => (
            <Card tone="playful" style={[styles.badge, !item.earnedAt && { opacity: 0.45 }]} accessibilityLabel={`${item.name}. ${item.desc}`}>
              <Text style={styles.emoji}>{item.glyph ?? '🎖️'}</Text>
              <Text variant="label" align="center" numberOfLines={2}>
                {item.name}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing['4xl'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  highlight: { borderColor: colors.accent, borderWidth: 3 },
  badge: { flex: 1, alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 36, lineHeight: 44 },
});
