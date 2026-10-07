import { useMemo, useState } from 'react';

import { BarChart, ChartCard, LineChart } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { IconButton, ListRow, LoadingState, SectionHeader, Text } from '@/components/ui';
import { KpiGrid } from '@/features/dashboard';
import { DistrictError } from '@/features/district/DistrictUnavailable';
import { FilterBar, toDistrictFilters, type FilterState } from '@/features/district/FilterBar';
import { SchoolCompareCard } from '@/features/district/SchoolCompareCard';
import { useDistrictAnalytics } from '@/hooks/district';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme';

export default function DistrictDashboardScreen() {
  const { t, locale } = useT();
  const district = useAuthStore((s) => s.user?.district);
  const [filters, setFilters] = useState<FilterState>({ range: 'month' });
  const apiFilters = useMemo(() => toDistrictFilters(filters), [filters]);
  const q = useDistrictAnalytics(apiFilters);
  const d = q.data;

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="district-dashboard">
      <ScreenHeader title={t('district.dashboard.title')} subtitle={d?.district.name ?? district?.name} right={<IconButton icon="notifications" label={t('common.notifications')} onPress={() => go('/modal/notifications')} />} />
      <FilterBar value={filters} onChange={setFilters} schools={d?.schools.map((s) => ({ id: s.id, name: s.name }))} />
      {q.isLoading ? (
        <LoadingState cards={4} />
      ) : q.isError && !d ? (
        <DistrictError error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          <KpiGrid
            locale={locale}
            items={[
              { label: t('district.dashboard.schools'), kpi: { value: d.totals.schools, unit: 'count' }, icon: 'business', onPress: () => go('/(district-leader)/schools') },
              { label: t('district.dashboard.students'), kpi: { value: d.totals.students, unit: 'count' }, icon: 'people', onPress: () => go('/(district-leader)/students') },
              { label: t('district.dashboard.teachers'), kpi: { value: d.totals.teachers, unit: 'count' }, icon: 'person', onPress: () => go('/(district-leader)/teachers') },
              { label: t('district.dashboard.activeUsers'), kpi: { value: d.totals.activeUsers, unit: 'count' }, icon: 'pulse', accent: colors.secondary },
              { label: t('district.dashboard.courseCompletion'), kpi: { value: d.totals.courseCompletion, unit: 'percent' }, icon: 'checkmark-done', accent: colors.success },
              { label: t('district.dashboard.averageScore'), kpi: { value: d.totals.averageScore, unit: 'percent' }, icon: 'ribbon', accent: colors.info },
            ]}
          />
          <ChartCard title={`${t('analytics.dau')} / ${t('analytics.wau')} / ${t('analytics.mau')}`}>
            <BarChart
              accessibilityLabel={t('district.dashboard.activeUsers')}
              data={[
                { label: 'DAU', value: d.activity.dau, color: colors.primary },
                { label: 'WAU', value: d.activity.wau, color: colors.secondary },
                { label: 'MAU', value: d.activity.mau, color: colors.success },
              ]}
            />
          </ChartCard>
          <ChartCard title={t('district.dashboard.outcomes')} empty={!d.outcomes.length}>
            <LineChart accessibilityLabel={t('district.dashboard.outcomes')} labels={d.outcomes.map((o) => o.label)} series={[{ label: t('district.dashboard.averageScore'), values: d.outcomes.map((o) => o.value) }]} max={100} unit="%" />
          </ChartCard>
          <SectionHeader title={t('district.dashboard.comparison')} onSeeAll={() => go('/(district-leader)/schools')} />
          {d.schools.slice(0, 5).map((s) => (
            <SchoolCompareCard key={s.id} school={s} onPress={() => go(`/(district-leader)/school/${s.id}`)} />
          ))}
          <ListRow title={t('nav.students')} left={<Text>🧑‍🎓</Text>} onPress={() => go('/(district-leader)/students')} />
          <ListRow title={t('nav.teachers')} left={<Text>🧑🏾‍🏫</Text>} onPress={() => go('/(district-leader)/teachers')} />
        </>
      ) : null}
    </Screen>
  );
}
