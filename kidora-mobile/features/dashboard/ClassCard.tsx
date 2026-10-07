import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/charts';
import { Badge, Card, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, spacing } from '@/theme';
import type { ClassSummary } from '@/types';

function ClassCardBase({ cls, onPress }: { cls: ClassSummary; onPress?: () => void }) {
  const { t } = useT();
  return (
    <Card onPress={onPress} accessibilityLabel={`${cls.name}, ${cls.grade}, ${cls.studentCount} ${t('teacher.class.students')}`} style={styles.card}>
      <ProgressRing value={cls.completionPercent} size={64} color={cls.subjectAccent ?? colors.primary} label={t('teacher.class.completion')} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {cls.name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {[cls.grade, cls.subject, `${cls.studentCount} ${t('teacher.class.students').toLowerCase()}`].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.badges}>
          <Badge label={`${t('teacher.class.averageScore')} ${cls.averageScore}%`} tone="info" />
          {cls.atRiskCount > 0 ? <Badge label={t('teacher.class.atRisk', { count: cls.atRiskCount })} tone="danger" icon="warning" /> : null}
        </View>
      </View>
    </Card>
  );
}

export const ClassCard = memo(ClassCardBase);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
