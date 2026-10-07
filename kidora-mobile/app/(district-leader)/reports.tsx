import { useMemo, useState } from 'react';

import { Screen, ScreenHeader } from '@/components/layout';
import { Card, ListRow, LoadingState, Text } from '@/components/ui';
import { DistrictError } from '@/features/district/DistrictUnavailable';
import { FilterBar, toDistrictFilters, type FilterState } from '@/features/district/FilterBar';
import { useDistrictAnalytics } from '@/hooks/district';
import { useT } from '@/hooks/useT';
import { colors } from '@/theme';
import { formatNumber } from '@/utils/format';

export default function DistrictReports() {
  const { t, locale } = useT();
  const [filters, setFilters] = useState<FilterState>({ range: 'quarter' });
  const apiFilters = useMemo(() => toDistrictFilters(filters), [filters]);
  const q = useDistrictAnalytics(apiFilters);
  const d = q.data;
  const ranked = [...(d?.schools ?? [])].sort((a, b) => b.learningGrowth - a.learningGrowth);
  return (
    <Screen testID="district-reports">
      <ScreenHeader title={t('nav.reports')} />
      <FilterBar value={filters} onChange={setFilters} />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError && !d ? (
        <DistrictError error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          <Card tone="tinted" tint={colors.primarySoft}>
            <Text variant="h3">{t('district.dashboard.performance')}</Text>
            <Text>{`${formatNumber(d.totals.students, locale)} ${t('nav.students').toLowerCase()} · ${d.totals.averageScore}% · ${d.totals.courseCompletion}%`}</Text>
          </Card>
          {ranked.map((s, i) => (
            <ListRow key={s.id} title={`${i + 1}. ${s.name}`} subtitle={`${t('district.dashboard.learningGrowth')}: ${s.learningGrowth >= 0 ? '+' : ''}${s.learningGrowth}%`} />
          ))}
          <Text variant="caption" color="textMuted">
            {t('school.reports.exportHint')}
          </Text>
        </>
      ) : null}
    </Screen>
  );
}
