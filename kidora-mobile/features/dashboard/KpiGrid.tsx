import { memo } from 'react';
import { View } from 'react-native';

import { StatCard, type IconName } from '@/components/ui';
import { spacing } from '@/theme';
import type { Kpi } from '@/types';
import { formatNumber } from '@/utils/format';

export interface KpiItem {
  label: string;
  kpi: Kpi | undefined;
  icon?: IconName;
  accent?: string;
  onPress?: () => void;
}

export function formatKpi(kpi: Kpi | undefined, locale = 'en'): string {
  if (!kpi) return '—';
  if (kpi.unit === 'percent') return `${Math.round(kpi.value)}%`;
  return formatNumber(kpi.value, locale);
}

/** Two-up (phone) / wrapping (tablet) KPI cards — no desktop tables. */
function KpiGridBase({ items, locale }: { items: KpiItem[]; locale?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {items.map((i) => (
        <View key={i.label} style={{ flexBasis: '46%', flexGrow: 1 }}>
          <StatCard label={i.label} value={formatKpi(i.kpi, locale)} icon={i.icon} accent={i.accent} delta={i.kpi?.trend?.delta} caption={i.kpi?.trend?.label ?? i.kpi?.caption} onPress={i.onPress} />
        </View>
      ))}
    </View>
  );
}

export const KpiGrid = memo(KpiGridBase);
