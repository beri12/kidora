import { useLocalSearchParams } from 'expo-router';

import { ChartCard, LineChart } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { SubjectCard } from '@/components/lms';
import { Card, LoadingState, SectionHeader, Text } from '@/components/ui';
import { ClassCard, HealthDonut, KpiGrid } from '@/features/dashboard';
import { DistrictError } from '@/features/district/DistrictUnavailable';
import { useDistrictSchool } from '@/hooks/district';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';

/** Drill-down into one school of the district (same shape as the school dashboard). */
export default function DistrictSchool() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const q = useDistrictSchool(id);
  const d = q.data;
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="district-school">
      <ScreenHeader title={d?.school.name ?? t('nav.schools')} back />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError && !d ? (
        <DistrictError error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          <KpiGrid
            locale={locale}
            items={[
              { label: t('school.dashboard.students'), kpi: d.kpis.students, icon: 'people' },
              { label: t('school.dashboard.teachers'), kpi: d.kpis.teachers, icon: 'person' },
              { label: t('school.dashboard.classes'), kpi: d.kpis.classes, icon: 'grid' },
              { label: t('school.dashboard.completion'), kpi: d.kpis.averageCompletion, icon: 'checkmark-done' },
            ]}
          />
          <ChartCard title={t('school.dashboard.learningProgress')} empty={!d.learningProgress.series.length}>
            <LineChart accessibilityLabel={t('school.dashboard.learningProgress')} labels={d.learningProgress.labels} series={d.learningProgress.series.map((s) => ({ label: s.label, values: s.values, color: s.color }))} max={100} unit="%" />
          </ChartCard>
          <Card style={{ gap: spacing.md }}>
            <Text variant="h3">{t('school.dashboard.health')}</Text>
            <HealthDonut health={d.studentHealth} />
          </Card>
          <SectionHeader title={t('school.dashboard.topSubjects')} />
          {d.topSubjects.map((s) => (
            <SubjectCard key={s.subject} subject={s.subject} percent={s.completion} accent={s.accent} />
          ))}
          <SectionHeader title={t('school.dashboard.topClasses')} />
          {d.topClasses.map((c) => (
            <ClassCard key={c.id} cls={c} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
