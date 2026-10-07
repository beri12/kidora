import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { BarChart, ChartCard, LineChart } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { SubjectCard } from '@/components/lms';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { KpiGrid, RangePicker } from '@/features/dashboard';
import { useOwnChild } from '@/features/parent/useOwnChild';
import { useParentDashboard } from '@/hooks/parent';
import { useT } from '@/hooks/useT';
import { colors } from '@/theme';
import type { DateRange } from '@/types';

export default function ChildProgress() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const own = useOwnChild(id);
  const [range, setRange] = useState<DateRange>('month');
  const q = useParentDashboard(own.child ? id : undefined, range);
  const d = own.child ? q.data : undefined;

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="child-progress">
      <ScreenHeader title={t('parent.child.progress')} subtitle={own.child?.displayName ?? own.child?.name} back />
      {own.forbidden ? (
        <EmptyState emoji="🔒" title={t('errors.forbidden')} />
      ) : q.isLoading || own.isLoading ? (
        <LoadingState />
      ) : q.isError && !d ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          <RangePicker value={range} onChange={setRange} options={['week', 'month', 'quarter', 'year']} />
          <KpiGrid
            locale={locale}
            items={[
              { label: t('parent.dashboard.progress'), kpi: d.kpis?.overallProgress, icon: 'trending-up' },
              { label: t('parent.dashboard.lessonsCompleted'), kpi: d.kpis?.lessonsCompleted, icon: 'book' },
              { label: t('parent.dashboard.quizScores'), kpi: d.kpis?.quizAverage, icon: 'help-circle' },
              { label: t('parent.dashboard.coins'), kpi: d.kpis?.coins, icon: 'cash' },
            ]}
          />
          <ChartCard title={t('analytics.learningTime')} empty={!d.weeklyActivity.minutes.length}>
            <LineChart accessibilityLabel={t('analytics.learningTime')} labels={d.weeklyActivity.labels} series={[{ label: t('analytics.learningTime'), values: d.weeklyActivity.minutes, color: colors.secondary }]} unit="m" />
          </ChartCard>
          <ChartCard title={t('analytics.lessonCompletion')} empty={!d.kpis?.lessonsCompleted.trend?.series?.length}>
            <BarChart accessibilityLabel={t('analytics.lessonCompletion')} data={(d.kpis?.lessonsCompleted.trend?.series ?? []).map((v, i) => ({ label: d.weeklyActivity.labels[i] ?? `${i + 1}`, value: v }))} />
          </ChartCard>
          {d.subjectProgress.map((s) => (
            <SubjectCard key={s.subject} subject={s.subject} percent={s.percent} accent={s.accent} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
