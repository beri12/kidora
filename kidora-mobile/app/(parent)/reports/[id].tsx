import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DonutChart } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { Card, EmptyState, ErrorState, LoadingState, SectionHeader, Text } from '@/components/ui';
import { RangePicker } from '@/features/dashboard';
import { InsightsCard } from '@/features/parent/InsightsCard';
import { useOwnChild } from '@/features/parent/useOwnChild';
import { useParentDashboard } from '@/hooks/parent';
import { useT } from '@/hooks/useT';
import { colors, spacing } from '@/theme';
import type { DateRange } from '@/types';
import { firstName, formatMinutes } from '@/utils/format';

/** Readable period report for a parent (built from the dashboard API). */
export default function ChildReport() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const own = useOwnChild(id);
  const [range, setRange] = useState<DateRange>('week');
  const q = useParentDashboard(own.child ? id : undefined, range);
  const d = own.child ? q.data : undefined;
  const name = own.child?.displayName ?? firstName(own.child?.name);

  return (
    <Screen testID="child-report">
      <ScreenHeader title={t('parent.reports.title')} subtitle={name} back />
      {own.forbidden ? (
        <EmptyState emoji="🔒" title={t('errors.forbidden')} />
      ) : q.isLoading || own.isLoading ? (
        <LoadingState />
      ) : q.isError && !d ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          <RangePicker value={range} onChange={setRange} options={['week', 'month', 'quarter']} />
          <Card tone="tinted" tint={colors.primarySoft}>
            <Text variant="h3">{`📄 ${t(`common.${range}`)}`}</Text>
            <Text>
              {t('parent.reports.summary', {
                name,
                lessons: d.weeklyActivity.lessons,
                minutes: formatMinutes(d.weeklyActivity.totalMinutes),
              })}
            </Text>
          </Card>
          <Card>
            <DonutChart
              accessibilityLabel={t('parent.child.activity')}
              slices={[
                { label: t('parent.dashboard.lessonsCompleted'), value: d.weeklyActivity.lessons, color: colors.primary },
                { label: t('nav.quizzes'), value: d.weeklyActivity.quizzes, color: colors.secondary },
                { label: t('nav.assignments'), value: d.weeklyActivity.assignments, color: colors.success },
              ]}
            />
          </Card>
          <InsightsCard insights={d.insights} />
          <SectionHeader title={t('parent.dashboard.subjects')} />
          <View style={{ gap: spacing.sm }}>
            {d.subjectProgress.map((s) => (
              <Text key={s.subject}>{`• ${s.subject}: ${s.percent}%`}</Text>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
