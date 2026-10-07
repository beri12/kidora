import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { colors, radius, spacing } from '@/theme';
import type { Achievement } from '@/types';

function AchievementPreviewBase({ achievements }: { achievements: Achievement[] }) {
  const { t } = useT();
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={t('student.dashboard.achievements')} onSeeAll={() => go('/(student)/achievements')} />
      {achievements.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {achievements.map((a) => (
            <Card key={a.id} tone="playful" style={styles.card} accessibilityLabel={`${a.title}. ${a.description}`}>
              <View style={styles.medal}>
                <Text style={styles.emoji}>🏅</Text>
              </View>
              <Text variant="label" align="center" numberOfLines={2}>
                {a.title}
              </Text>
            </Card>
          ))}
        </ScrollView>
      ) : (
        <Card tone="tinted" tint={colors.accentSoft}>
          <Text>{t('student.achievements.empty')}</Text>
        </Card>
      )}
    </View>
  );
}

export const AchievementPreview = memo(AchievementPreviewBase);

const styles = StyleSheet.create({
  card: { width: 120, alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  medal: { width: 60, height: 60, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 32, lineHeight: 40 },
});
