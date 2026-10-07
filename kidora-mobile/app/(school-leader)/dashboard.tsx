import { useState } from 'react';
import { View } from 'react-native';

import { ChartCard, LineChart } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { SubjectCard } from '@/components/lms';
import { Card, ErrorState, IconButton, ListRow, LoadingState, SectionHeader, Text } from '@/components/ui';
import { ActivityFeed, ClassCard, HealthDonut, KpiGrid, RangePicker } from '@/features/dashboard';
import { useSchoolDashboard } from '@/hooks/school';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { colors, spacing } from '@/theme';
import type { DateRange } from '@/types';

export default function SchoolDashboardScreen() {
  const { t, locale } = useT();
  const [range, setRange] = useState<DateRange>('week');
  const q = useSchoolDashboard(range);
  const d = q.data;
  const active = d ? d.studentHealth.onTrack + d.studentHealth.needsSupport : 0;

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="school-dashboard">
      <ScreenHeader
        title={t('school.dashboard.title')}
        subtitle={d?.school.name}
        right={
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <IconButton icon="notifications" label={t('common.notifications')} onPress={() => go('/modal/notifications')} />
            <IconButton icon="settings" label={t('common.settings')} onPress={() => go('/(school-leader)/settings')} />
          </View>
        }
      />
      {q.isLoading ? (
        <LoadingState cards={4} />
      ) : q.isError && !d ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          <RangePicker value={range} onChange={setRange} />
          <KpiGrid
            locale={locale}
            items={[
              { label: t('school.dashboard.students'), kpi: d.kpis.students, icon: 'people', onPress: () => go('/(school-leader)/students') },
              { label: t('school.dashboard.teachers'), kpi: d.kpis.teachers, icon: 'person', onPress: () => go('/(school-leader)/teachers') },
              { label: t('school.dashboard.classes'), kpi: d.kpis.classes, icon: 'grid', onPress: () => go('/(school-leader)/classes') },
              { label: t('school.dashboard.courses'), kpi: d.kpis.courses, icon: 'book', onPress: () => go('/(school-leader)/courses') },
              { label: t('school.dashboard.completion'), kpi: d.kpis.averageCompletion, icon: 'checkmark-done', accent: colors.success },
              { label: t('school.dashboard.activeLearners'), kpi: { value: active, unit: 'count' }, icon: 'pulse', accent: colors.secondary },
            ]}
          />
          <ChartCard title={t('school.dashboard.learningProgress')} empty={!d.learningProgress.series.length}>
            <LineChart accessibilityLabel={t('school.dashboard.learningProgress')} labels={d.learningProgress.labels} series={d.learningProgress.series.map((s) => ({ label: s.label, values: s.values, color: s.color }))} max={100} unit="%" />
          </ChartCard>
          <Card style={{ gap: spacing.md }}>
            <Text variant="h3">{t('school.dashboard.health')}</Text>
            <HealthDonut health={d.studentHealth} />
          </Card>
          <SectionHeader title={t('school.dashboard.academic')} />
          <KpiGrid
            locale={locale}
            items={[
              { label: t('school.dashboard.quizAverage'), kpi: { value: d.academicOverview.quizAverage, unit: 'percent' }, icon: 'help-circle' },
              { label: t('school.dashboard.examPassRate'), kpi: { value: d.academicOverview.examPassRate, unit: 'percent' }, icon: 'school' },
              { label: t('school.dashboard.assignmentCompletion'), kpi: { value: d.academicOverview.assignmentCompletion, unit: 'percent' }, icon: 'document-text' },
            ]}
          />
          <SectionHeader title={t('school.dashboard.topSubjects')} />
          {d.topSubjects.map((s) => (
            <SubjectCard key={s.subject} subject={s.subject} percent={s.completion} accent={s.accent} />
          ))}
          <SectionHeader title={t('school.dashboard.topClasses')} onSeeAll={() => go('/(school-leader)/classes')} />
          {d.topClasses.map((c) => (
            <ClassCard key={c.id} cls={c} />
          ))}
          <SectionHeader title={t('teacher.dashboard.recentActivity')} />
          <ActivityFeed items={d.recentActivity} />
          <ListRow title={t('nav.courses')} left={<Text>📚</Text>} onPress={() => go('/(school-leader)/courses')} />
        </>
      ) : null}
    </Screen>
  );
}
