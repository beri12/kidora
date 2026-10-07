import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ProgressBar, Text } from '@/components/ui';
import { islandDefinition } from '@/features/game/islands';
import { useT } from '@/hooks/useT';
import { go, lessonHref } from '@/lib/navigation';
import { spacing } from '@/theme';
import type { StudentDashboard } from '@/types';

function ContinueLearningCardBase({ adventure }: { adventure: NonNullable<StudentDashboard['adventure']> }) {
  const { t } = useT();
  const island = islandDefinition(adventure.world);
  const lesson = adventure.lesson;
  return (
    <Card tone="tinted" tint={`${island.accent}1F`} style={styles.card} testID="continue-learning">
      <View style={styles.row}>
        <Text style={styles.emoji}>{island.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text variant="label" color="textMuted">
            {t('student.dashboard.continueLearning')}
          </Text>
          <Text variant="h3" numberOfLines={2}>
            {lesson?.title ?? adventure.course.title}
          </Text>
          {lesson ? (
            <Text variant="caption" color="textMuted">
              {`${adventure.course.title} · ${t('student.dashboard.lessonOf', { current: lesson.order, total: lesson.total })}`}
            </Text>
          ) : null}
        </View>
      </View>
      <ProgressBar value={adventure.progressPercent / 100} color={island.accent} />
      <Button
        label={t('common.continue')}
        variant="game"
        iconRight="arrow-forward"
        fullWidth
        onPress={() => (lesson ? go(lessonHref(lesson.id, adventure.course.id)) : go(`/(student)/island/${adventure.world}`))}
        testID="continue-button"
      />
    </Card>
  );
}

export const ContinueLearningCard = memo(ContinueLearningCardBase);

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  emoji: { fontSize: 44, lineHeight: 54 },
});
