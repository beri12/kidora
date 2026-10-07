import { useState } from 'react';

import { Screen, ScreenHeader } from '@/components/layout';
import { Card, ErrorState, ListRow, LoadingState, Text } from '@/components/ui';
import { formatKpi, RangePicker } from '@/features/dashboard';
import { useSchoolDashboard } from '@/hooks/school';
import { useT } from '@/hooks/useT';
import { colors } from '@/theme';
import type { DateRange } from '@/types';

/** Mobile-friendly report summary; full exports stay on the web console. */
export default function SchoolReports() {
  const { t, locale } = useT();
  const [range, setRange] = useState<DateRange>('month');
  const q = useSchoolDashboard(range);
  const d = q.data;
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="school-reports">
      <ScreenHeader title={t('school.reports.title')} />
      <RangePicker value={range} onChange={setRange} options={['week', 'month', 'quarter', 'year']} />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError && !d ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          <Card tone="tinted" tint={colors.primarySoft}>
            <Text variant="h3">{t('school.reports.summary', { name: d.school.name })}</Text>
          </Card>
          <ListRow title={t('school.dashboard.students')} right={<Text variant="bodyStrong">{formatKpi(d.kpis.students, locale)}</Text>} />
          <ListRow title={t('school.dashboard.teachers')} right={<Text variant="bodyStrong">{formatKpi(d.kpis.teachers, locale)}</Text>} />
          <ListRow title={t('school.dashboard.completion')} right={<Text variant="bodyStrong">{formatKpi(d.kpis.averageCompletion, locale)}</Text>} />
          <ListRow title={t('school.dashboard.quizAverage')} right={<Text variant="bodyStrong">{`${d.academicOverview.quizAverage}%`}</Text>} />
          <ListRow title={t('school.dashboard.examPassRate')} right={<Text variant="bodyStrong">{`${d.academicOverview.examPassRate}%`}</Text>} />
          <ListRow title={t('teacher.health.AT_RISK')} right={<Text variant="bodyStrong" color="danger">{`${d.studentHealth.atRisk}`}</Text>} />
          <Text variant="caption" color="textMuted">
            {t('school.reports.exportHint')}
          </Text>
        </>
      ) : null}
    </Screen>
  );
}
