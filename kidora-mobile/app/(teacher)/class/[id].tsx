import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { ChartCard, LineChart } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { Button, Card, EmptyState, ErrorState, LoadingState, SegmentedControl, Text } from '@/components/ui';
import { HealthDonut, KpiGrid, StudentRow } from '@/features/dashboard';
import { useTeacherClass } from '@/hooks/teacher';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { spacing } from '@/theme';

type Tab = 'students' | 'performance' | 'leaderboard' | 'interventions';

export default function TeacherClass() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const q = useTeacherClass(id);
  const [tab, setTab] = useState<Tab>('students');
  const d = q.data;

  const ranked = useMemo(() => [...(d?.students ?? [])].sort((a, b) => b.averageScore - a.averageScore), [d?.students]);
  const needsHelp = useMemo(() => (d?.students ?? []).filter((s) => s.health !== 'ON_TRACK'), [d?.students]);
  const health = useMemo(
    () => ({
      onTrack: (d?.students ?? []).filter((s) => s.health === 'ON_TRACK').length,
      needsSupport: (d?.students ?? []).filter((s) => s.health === 'NEEDS_SUPPORT').length,
      atRisk: (d?.students ?? []).filter((s) => s.health === 'AT_RISK').length,
      total: d?.students.length ?? 0,
    }),
    [d?.students],
  );

  if (q.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (!d) {
    return (
      <Screen>
        <ScreenHeader title="" back />
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </Screen>
    );
  }
  const open = (studentId: string) => go(`/(teacher)/student/${studentId}`);

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="teacher-class">
      <ScreenHeader title={d.name} subtitle={[d.grade, d.subject].filter(Boolean).join(' · ')} back />
      <KpiGrid
        locale={locale}
        items={[
          { label: t('teacher.class.students'), kpi: { value: d.studentCount, unit: 'count' }, icon: 'people' },
          { label: t('teacher.class.averageScore'), kpi: { value: d.averageScore, unit: 'percent' }, icon: 'ribbon' },
          { label: t('teacher.class.completion'), kpi: { value: d.completionPercent, unit: 'percent' }, icon: 'checkmark-done' },
          { label: t('teacher.health.AT_RISK'), kpi: { value: d.atRiskCount, unit: 'count' }, icon: 'warning' },
        ]}
      />
      <SegmentedControl
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'students', label: t('teacher.class.students') },
          { value: 'performance', label: t('teacher.class.performance') },
          { value: 'leaderboard', label: t('teacher.class.leaderboard') },
          { value: 'interventions', label: t('teacher.class.interventions') },
        ]}
      />
      {tab === 'students' ? (d.students.length ? d.students.map((s) => <StudentRow key={s.id} student={s} onPress={() => open(s.id)} />) : <EmptyState emoji="🧑‍🎓" title={t('teacher.class.noStudents')} />) : null}
      {tab === 'performance' ? (
        <>
          <ChartCard title={t('teacher.class.progress')} empty={!d.progress.series.length}>
            <LineChart accessibilityLabel={t('teacher.class.progress')} labels={d.progress.labels} series={d.progress.series.map((s) => ({ label: s.label, values: s.values, color: s.color }))} max={100} unit="%" />
          </ChartCard>
          <Card style={{ gap: spacing.md }}>
            <Text variant="h3">{t('school.dashboard.health')}</Text>
            <HealthDonut health={health} />
          </Card>
          <Button label={t('nav.assignments')} variant="outline" icon="document-text" onPress={() => go('/(teacher)/assignments')} />
          <Button label={t('nav.quizzes')} variant="outline" icon="help-circle" onPress={() => go('/(teacher)/quizzes')} />
        </>
      ) : null}
      {tab === 'leaderboard' ? ranked.slice(0, 10).map((s, i) => <StudentRow key={s.id} student={{ ...s, name: `${i + 1}. ${s.name}` }} onPress={() => open(s.id)} />) : null}
      {tab === 'interventions' ? (needsHelp.length ? needsHelp.map((s) => <StudentRow key={s.id} student={s} onPress={() => open(s.id)} />) : <EmptyState emoji="🌟" title={t('teacher.health.ON_TRACK')} />) : null}
    </Screen>
  );
}
