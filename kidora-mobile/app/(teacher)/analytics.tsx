import { useState } from 'react';

import { BarChart, ChartCard, LineChart } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { ErrorState, LoadingState, SectionHeader, SegmentedControl } from '@/components/ui';
import { KpiGrid, StudentRow } from '@/features/dashboard';
import { useTeacherAnalytics, useTeacherClasses } from '@/hooks/teacher';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { colors } from '@/theme';

export default function TeacherAnalyticsScreen() {
  const { t, locale } = useT();
  const classes = useTeacherClasses();
  const [classId, setClassId] = useState<string>('all');
  const q = useTeacherAnalytics(classId === 'all' ? undefined : classId);
  const d = q.data;

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="teacher-analytics">
      <ScreenHeader title={t('teacher.analytics.title')} />
      <SegmentedControl value={classId} onChange={setClassId} segments={[{ value: 'all', label: t('common.all') }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError && !d ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          <KpiGrid
            locale={locale}
            items={[
              { label: t('teacher.analytics.assignmentCompletion'), kpi: { value: d.assignmentCompletion, unit: 'percent' }, icon: 'document-text' },
              { label: t('teacher.analytics.quizAverage'), kpi: { value: d.quizAverage, unit: 'percent' }, icon: 'help-circle' },
              { label: t('teacher.analytics.examAverage'), kpi: { value: d.examAverage, unit: 'percent' }, icon: 'school' },
            ]}
          />
          <ChartCard title={t('teacher.dashboard.classProgress')} empty={!d.classPerformance.series.length}>
            <LineChart accessibilityLabel={t('teacher.dashboard.classProgress')} labels={d.classPerformance.labels} series={d.classPerformance.series.map((s) => ({ label: s.label, values: s.values, color: s.color }))} max={100} unit="%" />
          </ChartCard>
          <ChartCard title={t('teacher.dashboard.topics')} empty={!d.topics.length}>
            <BarChart accessibilityLabel={t('teacher.dashboard.topics')} data={d.topics.slice(0, 8).map((x) => ({ label: x.topic, value: x.masteryPercent, color: x.masteryPercent >= 70 ? colors.success : colors.accent }))} max={100} unit="%" />
          </ChartCard>
          <SectionHeader title={t('teacher.analytics.atRisk')} />
          {d.atRisk.map((s) => (
            <StudentRow key={s.id} student={s} onPress={() => go(`/(teacher)/student/${s.id}`)} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
