import { useMemo, useState } from 'react';

import { BarChart, ChartCard } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { LoadingState, SegmentedControl } from '@/components/ui';
import { DistrictError } from '@/features/district/DistrictUnavailable';
import { FilterBar, toDistrictFilters, type FilterState } from '@/features/district/FilterBar';
import { useDistrictAnalytics } from '@/hooks/district';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';
import { colors } from '@/theme';
import type { DistrictSchoolSummary } from '@/types';

type Metric = 'activeStudents' | 'averageScore' | 'completion' | 'engagement' | 'learningGrowth';

const METRICS: { value: Metric; label: TranslationKey; percent: boolean }[] = [
  { value: 'activeStudents', label: 'district.dashboard.activeUsers', percent: false },
  { value: 'averageScore', label: 'district.dashboard.averageScore', percent: true },
  { value: 'completion', label: 'district.dashboard.courseCompletion', percent: true },
  { value: 'engagement', label: 'district.dashboard.engagement', percent: true },
  { value: 'learningGrowth', label: 'district.dashboard.learningGrowth', percent: true },
];

/** School comparison: one metric at a time, as bars — readable on a phone. */
export default function DistrictAnalyticsScreen() {
  const { t } = useT();
  const [filters, setFilters] = useState<FilterState>({ range: 'month' });
  const [metric, setMetric] = useState<Metric>('averageScore');
  const apiFilters = useMemo(() => toDistrictFilters(filters), [filters]);
  const q = useDistrictAnalytics(apiFilters);
  const d = q.data;
  const m = METRICS.find((x) => x.value === metric) ?? METRICS[1];

  const data = (d?.schools ?? []).map((s: DistrictSchoolSummary) => ({ label: s.name, value: s[metric] }));

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} testID="district-analytics">
      <ScreenHeader title={t('nav.analytics')} />
      <FilterBar value={filters} onChange={setFilters} schools={d?.schools.map((s) => ({ id: s.id, name: s.name }))} />
      <SegmentedControl value={metric} onChange={setMetric} segments={METRICS.map((x) => ({ value: x.value, label: t(x.label) }))} accessibilityLabel={t('district.compareBy')} />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError && !d ? (
        <DistrictError error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <ChartCard title={`${t('district.dashboard.comparison')} · ${t(m?.label ?? 'district.dashboard.averageScore')}`} empty={!data.length}>
          <BarChart accessibilityLabel={t('district.dashboard.comparison')} data={data} color={colors.primary} max={m?.percent ? 100 : undefined} unit={m?.percent ? '%' : ''} />
        </ChartCard>
      ) : null}
    </Screen>
  );
}
