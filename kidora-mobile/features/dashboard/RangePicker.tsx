import { SegmentedControl } from '@/components/ui';
import { useT } from '@/hooks/useT';
import type { DateRange } from '@/types';

export function RangePicker({ value, onChange, options = ['week', 'month', 'quarter'] }: { value: DateRange; onChange: (r: DateRange) => void; options?: DateRange[] }) {
  const { t } = useT();
  return <SegmentedControl value={value} onChange={onChange} segments={options.map((o) => ({ value: o, label: t(`common.${o}`) }))} accessibilityLabel={t('district.filters.dateRange')} />;
}
