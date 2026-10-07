import { useState } from 'react';

import { BarChart, ChartCard, LineChart } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { Card, ErrorState, LoadingState, Text } from '@/components/ui';
import { HealthDonut, RangePicker } from '@/features/dashboard';
import { useSchoolAnalytics } from '@/hooks/school';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';
import type { DateRange } from '@/types';

export default function SchoolAnalyticsScreen() {
  const { t } = useT();
  const [range, setRange] = useState<DateRange>('month');
  const q = useSchoolAnalytics(range);
  const d = q.data;
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="school-analytics">
      <ScreenHeader title={t('nav.analytics')} />
      <RangePicker value={range} onChange={setRange} options={['week', 'month', 'quarter', 'year']} />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError && !d ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          <ChartCard title={t('school.dashboard.learningProgress')} empty={!d.progress.series.length}>
            <LineChart accessibilityLabel={t('school.dashboard.learningProgress')} labels={d.progress.labels} series={d.progress.series.map((s) => ({ label: s.label, values: s.values, color: s.color }))} max={100} unit="%" />
          </ChartCard>
          <ChartCard title={t('analytics.quizScore')} empty={!d.subjects.length}>
            <BarChart accessibilityLabel={t('analytics.quizScore')} data={d.subjects.map((s) => ({ label: s.subject, value: s.averageScore, color: s.accent ?? undefined }))} max={100} unit="%" />
          </ChartCard>
          <ChartCard title={t('analytics.lessonCompletion')} empty={!d.subjects.length}>
            <BarChart accessibilityLabel={t('analytics.lessonCompletion')} data={d.subjects.map((s) => ({ label: s.subject, value: s.completion, color: s.accent ?? undefined }))} max={100} unit="%" />
          </ChartCard>
          <Card style={{ gap: spacing.md }}>
            <Text variant="h3">{t('school.dashboard.health')}</Text>
            <HealthDonut health={d.health} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
