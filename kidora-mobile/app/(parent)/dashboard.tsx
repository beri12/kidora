import { useState } from 'react';
import { View } from 'react-native';

import { BarChart, ChartCard } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { SubjectCard } from '@/components/lms';
import { Card, EmptyState, ErrorState, IconButton, ListRow, LoadingState, SectionHeader, Text } from '@/components/ui';
import { KpiGrid, RangePicker } from '@/features/dashboard';
import { ChildSelector } from '@/features/parent/ChildSelector';
import { InsightsCard } from '@/features/parent/InsightsCard';
import { useParentDashboard } from '@/hooks/parent';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { useUserStore } from '@/store/userStore';
import { colors, spacing } from '@/theme';
import type { DateRange } from '@/types';
import { formatDate, formatMinutes } from '@/utils/format';

export default function ParentDashboardScreen() {
  const { t, locale } = useT();
  const selected = useUserStore((s) => s.selectedChildId);
  const setSelected = useUserStore((s) => s.setSelectedChild);
  const [range, setRange] = useState<DateRange>('week');
  const q = useParentDashboard(selected ?? undefined, range);
  const d = q.data;

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="parent-dashboard">
      <ScreenHeader title={t('parent.dashboard.title')} right={<IconButton icon="notifications" label={t('common.notifications')} onPress={() => go('/modal/notifications')} />} />
      {q.isLoading ? (
        <LoadingState cards={4} />
      ) : q.isError && !d ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !d || !d.children.length ? (
        <EmptyState emoji="👪" title={t('parent.dashboard.noChildren')} body={t('parent.dashboard.noChildrenBody')} />
      ) : (
        <>
          <ChildSelector items={d.children} value={d.selectedChildId} onChange={setSelected} />
          <RangePicker value={range} onChange={setRange} />
          <KpiGrid
            locale={locale}
            items={[
              { label: t('parent.dashboard.progress'), kpi: d.kpis?.overallProgress, icon: 'trending-up', onPress: () => go(`/(parent)/progress/${d.selectedChildId}`) },
              { label: t('parent.dashboard.lessonsCompleted'), kpi: d.kpis?.lessonsCompleted, icon: 'book', accent: colors.success },
              { label: t('parent.dashboard.quizScores'), kpi: d.kpis?.quizAverage, icon: 'help-circle', accent: colors.info },
              { label: t('parent.dashboard.streak'), kpi: d.kpis?.streak, icon: 'flame', accent: colors.streak },
            ]}
          />
          <ChartCard title={`${t('parent.dashboard.weekly')} · ${formatMinutes(d.weeklyActivity.totalMinutes)}`} empty={!d.weeklyActivity.minutes.some((m) => m > 0)}>
            <BarChart
              accessibilityLabel={t('parent.dashboard.timeSpent')}
              data={d.weeklyActivity.labels.map((label, i) => ({ label, value: d.weeklyActivity.minutes[i] ?? 0 }))}
              color={colors.secondary}
            />
          </ChartCard>
          <SectionHeader title={t('parent.dashboard.subjects')} onSeeAll={() => go(`/(parent)/progress/${d.selectedChildId}`)} />
          {d.subjectProgress.length ? d.subjectProgress.map((s) => <SubjectCard key={s.subject} subject={s.subject} percent={s.percent} accent={s.accent} />) : <Text color="textMuted">{t('analytics.noData')}</Text>}
          <InsightsCard insights={d.insights} />
          <SectionHeader title={t('parent.dashboard.recommended')} />
          <Card style={{ gap: spacing.sm }}>
            {d.insights.needsPractice.slice(0, 2).map((topic) => (
              <Text key={topic}>{`📘 ${t('student.recommendation.PRACTICE', { title: topic })}`}</Text>
            ))}
            {d.tips.slice(0, 2).map((tip) => (
              <View key={tip.id}>
                <Text variant="bodyStrong">{tip.title}</Text>
                <Text variant="caption" color="textMuted">
                  {tip.body}
                </Text>
              </View>
            ))}
          </Card>
          {d.achievements.length ? (
            <>
              <SectionHeader title={t('parent.dashboard.achievements')} />
              {d.achievements.map((a) => (
                <ListRow key={a.id} title={a.title} subtitle={formatDate(a.unlockedAt, locale)} left={<Text>🏅</Text>} />
              ))}
            </>
          ) : null}
          {d.upcomingAssignments.length ? (
            <>
              <SectionHeader title={t('parent.dashboard.upcoming')} />
              {d.upcomingAssignments.map((a) => (
                <ListRow key={a.id} title={a.title} subtitle={[a.course, a.dueAt ? t('teacher.assignments.due', { date: formatDate(a.dueAt, locale) }) : null].filter(Boolean).join(' · ')} left={<Text>📝</Text>} />
              ))}
            </>
          ) : null}
          <ListRow title={t('parent.child.viewReport')} left={<Text>📄</Text>} onPress={() => go(`/(parent)/reports/${d.selectedChildId}`)} />
        </>
      )}
    </Screen>
  );
}
