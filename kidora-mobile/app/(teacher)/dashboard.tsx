import { useState } from 'react';

import { ChartCard, LineChart } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { Badge, EmptyState, ErrorState, IconButton, ListRow, LoadingState, ProgressBar, SectionHeader, Text } from '@/components/ui';
import { ActivityFeed, ClassCard, KpiGrid, RangePicker } from '@/features/dashboard';
import { useTeacherDashboard } from '@/hooks/teacher';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { colors, spacing } from '@/theme';
import type { DateRange } from '@/types';
import { formatDate } from '@/utils/format';
import { View } from 'react-native';

export default function TeacherDashboardScreen() {
  const { t, locale } = useT();
  const [range, setRange] = useState<DateRange>('week');
  const q = useTeacherDashboard(range);
  const d = q.data;

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="teacher-dashboard">
      <ScreenHeader
        title={t('teacher.dashboard.title')}
        subtitle={d?.profile.name}
        right={<IconButton icon="notifications" label={t('common.notifications')} onPress={() => go('/(teacher)/notifications')} />}
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
              { label: t('teacher.dashboard.totalStudents'), kpi: d.kpis.students, icon: 'people', onPress: () => go('/(teacher)/students') },
              { label: t('teacher.dashboard.pendingGrading'), kpi: d.kpis.pendingAssignments, icon: 'document-text', accent: colors.secondary, onPress: () => go('/(teacher)/assignments') },
              { label: t('teacher.dashboard.averagePerformance'), kpi: d.kpis.averageClassProgress, icon: 'trending-up', accent: colors.success },
              { label: t('teacher.dashboard.activeCourses'), kpi: d.kpis.coursesTeaching, icon: 'book', accent: colors.info },
            ]}
          />
          <ChartCard title={t('teacher.dashboard.classProgress')} empty={!d.classProgress.series.length}>
            <LineChart accessibilityLabel={t('teacher.dashboard.classProgress')} labels={d.classProgress.labels} series={d.classProgress.series.map((s) => ({ label: s.label, values: s.values, color: s.color }))} max={100} unit="%" />
          </ChartCard>
          {d.tasks.length ? (
            <>
              <SectionHeader title={t('teacher.dashboard.tasks')} />
              {d.tasks.map((task) => (
                <ListRow
                  key={`${task.type}-${task.id}`}
                  title={task.title}
                  subtitle={`${task.className} · ${formatDate(task.dueAt, locale)}`}
                  left={<Text>{task.type === 'EXAM' ? '🗓️' : '📝'}</Text>}
                  right={<Badge label={task.bucket} tone={task.bucket === 'OVERDUE' ? 'danger' : task.bucket === 'TODAY' ? 'warning' : 'neutral'} />}
                  onPress={task.type === 'ASSIGNMENT' ? () => go('/(teacher)/assignments') : undefined}
                />
              ))}
            </>
          ) : null}
          <SectionHeader title={t('nav.classes')} onSeeAll={() => go('/(teacher)/classes')} />
          {d.classes.length ? (
            d.classes.slice(0, 4).map((c) => <ClassCard key={c.id} cls={c} onPress={() => go(`/(teacher)/class/${c.id}`)} />)
          ) : (
            <EmptyState emoji="🏫" title={t('teacher.dashboard.noClasses')} body={t('teacher.dashboard.noClassesBody')} />
          )}
          {d.topics.length ? (
            <>
              <SectionHeader title={t('teacher.dashboard.topics')} />
              {d.topics.map((topic) => (
                <View key={topic.topic} style={{ gap: spacing.xs }}>
                  <Text variant="label">{`${topic.topic} · ${topic.masteryPercent}%`}</Text>
                  <ProgressBar value={topic.masteryPercent / 100} color={topic.masteryPercent >= 70 ? colors.success : colors.accent} height={8} />
                </View>
              ))}
            </>
          ) : null}
          <SectionHeader title={t('teacher.dashboard.recentActivity')} />
          <ActivityFeed items={d.activity} />
        </>
      ) : null}
    </Screen>
  );
}
