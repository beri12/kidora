import { memo } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { Card, Icon, SectionHeader, Text, type IconName } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { go, lessonHref } from '@/lib/navigation';
import { colors, spacing } from '@/theme';
import type { Recommendation } from '@/types';

const ICON: Record<Recommendation['kind'], IconName> = {
  CONTINUE: 'play',
  PRACTICE: 'barbell',
  CHALLENGE: 'flash',
  NEXT_LEVEL: 'rocket',
  QUEST: 'flag',
};

function open(r: Recommendation) {
  if (r.lessonId) go(lessonHref(r.lessonId, r.courseId));
  else if (r.worldKey) go(`/(student)/island/${r.worldKey}`);
  else go('/(student)/rewards');
}

function RecommendedListBase({ items }: { items: Recommendation[] }) {
  const { t } = useT();
  if (!items.length) return null;
  return (
    <>
      <SectionHeader title={t('student.dashboard.recommended')} />
      <FlatList
        horizontal
        data={items}
        keyExtractor={(r) => r.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => {
          const label = t(`student.recommendation.${item.kind}`, { title: item.title });
          return (
            <Card tone="playful" onPress={() => open(item)} accessibilityLabel={label} style={styles.card}>
              <Icon name={ICON[item.kind]} tint={colors.secondary} size={28} />
              <Text variant="bodyStrong" numberOfLines={3}>
                {label}
              </Text>
              {item.subtitle ? (
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </Card>
          );
        }}
      />
    </>
  );
}

export const RecommendedList = memo(RecommendedListBase);

const styles = StyleSheet.create({ card: { width: 200, gap: spacing.sm } });
