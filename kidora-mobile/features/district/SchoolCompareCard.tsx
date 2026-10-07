import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, spacing } from '@/theme';
import type { DistrictSchoolSummary } from '@/types';

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ gap: 2 }}>
      <View style={styles.metricHead}>
        <Text variant="tiny" color="textMuted">
          {label}
        </Text>
        <Text variant="tiny">{`${Math.round(value)}%`}</Text>
      </View>
      <ProgressBar value={value / 100} height={6} color={color} />
    </View>
  );
}

function SchoolCompareCardBase({ school, onPress }: { school: DistrictSchoolSummary; onPress?: () => void }) {
  const { t } = useT();
  return (
    <Card onPress={onPress} accessibilityLabel={school.name} style={{ gap: spacing.sm }}>
      <Text variant="bodyStrong">{school.name}</Text>
      <Text variant="caption" color="textMuted">
        {`${school.students} ${t('nav.students').toLowerCase()} · ${school.teachers} ${t('nav.teachers').toLowerCase()} · ${school.activeStudents} ${t('analytics.engagement').toLowerCase()}`}
      </Text>
      <Metric label={t('district.dashboard.averageScore')} value={school.averageScore} color={colors.primary} />
      <Metric label={t('district.dashboard.courseCompletion')} value={school.completion} color={colors.success} />
      <Metric label={t('district.dashboard.engagement')} value={school.engagement} color={colors.secondary} />
      <Text variant="tiny" color={school.learningGrowth >= 0 ? 'success' : 'danger'}>
        {`${t('district.dashboard.learningGrowth')}: ${school.learningGrowth >= 0 ? '+' : ''}${school.learningGrowth}%`}
      </Text>
    </Card>
  );
}

export const SchoolCompareCard = memo(SchoolCompareCardBase);

const styles = StyleSheet.create({ metricHead: { flexDirection: 'row', justifyContent: 'space-between' } });
