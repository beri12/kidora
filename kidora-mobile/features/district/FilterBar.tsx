import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet, Button, SegmentedControl, Text } from '@/components/ui';
import { RangePicker } from '@/features/dashboard';
import { useT } from '@/hooks/useT';
import { courseService } from '@/services/course.service';
import { spacing } from '@/theme';
import type { DateRange, DistrictFilters } from '@/types';

export function rangeToDates(range: DateRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (range === 'week' ? 7 : range === 'month' ? 30 : range === 'quarter' ? 90 : 365));
  return { from: from.toISOString(), to: to.toISOString() };
}

export interface FilterState {
  range: DateRange;
  schoolId?: string;
  gradeId?: string;
  subjectId?: string;
}

export function toDistrictFilters(f: FilterState): DistrictFilters {
  return { ...rangeToDates(f.range), schoolId: f.schoolId, gradeId: f.gradeId, subjectId: f.subjectId };
}

/** School / grade / subject / date-range filters in a bottom sheet (mobile-friendly). */
export function FilterBar({ value, onChange, schools = [] }: { value: FilterState; onChange: (f: FilterState) => void; schools?: { id: string; name: string }[] }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const lists = useQuery({ queryKey: ['learning', 'filters'], queryFn: courseService.filters, staleTime: 60 * 60_000, enabled: open });
  const active = [value.schoolId, value.gradeId, value.subjectId].filter(Boolean).length;

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <RangePicker value={value.range} onChange={(range) => onChange({ ...value, range })} options={['week', 'month', 'quarter', 'year']} />
      </View>
      <Button label={active ? `${t('common.filters')} (${active})` : t('common.filters')} size="sm" variant="outline" icon="options" onPress={() => { setDraft(value); setOpen(true); }} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('common.filters')}>
        <Text variant="label">{t('district.filters.school')}</Text>
        <SegmentedControl value={draft.schoolId ?? 'all'} onChange={(v) => setDraft({ ...draft, schoolId: v === 'all' ? undefined : v })} segments={[{ value: 'all', label: t('common.all') }, ...schools.map((s) => ({ value: s.id, label: s.name }))]} />
        <Text variant="label">{t('district.filters.grade')}</Text>
        <SegmentedControl value={draft.gradeId ?? 'all'} onChange={(v) => setDraft({ ...draft, gradeId: v === 'all' ? undefined : v })} segments={[{ value: 'all', label: t('common.all') }, ...(lists.data?.grades ?? []).map((g) => ({ value: g.id, label: g.name }))]} />
        <Text variant="label">{t('district.filters.subject')}</Text>
        <SegmentedControl value={draft.subjectId ?? 'all'} onChange={(v) => setDraft({ ...draft, subjectId: v === 'all' ? undefined : v })} segments={[{ value: 'all', label: t('common.all') }, ...(lists.data?.subjects ?? []).map((g) => ({ value: g.id, label: g.name }))]} />
        <Button label={t('common.done')} fullWidth onPress={() => { onChange(draft); setOpen(false); }} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } });
