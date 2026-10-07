import { DonutChart } from '@/components/charts';
import { useT } from '@/hooks/useT';
import { colors } from '@/theme';
import type { HealthBreakdown } from '@/types';

export function HealthDonut({ health }: { health: HealthBreakdown }) {
  const { t } = useT();
  const pct = health.total ? Math.round((health.onTrack / health.total) * 100) : 0;
  return (
    <DonutChart
      accessibilityLabel={t('school.dashboard.health')}
      centerLabel={`${pct}%`}
      slices={[
        { label: t('teacher.health.ON_TRACK'), value: health.onTrack, color: colors.success },
        { label: t('teacher.health.NEEDS_SUPPORT'), value: health.needsSupport, color: colors.accent },
        { label: t('teacher.health.AT_RISK'), value: health.atRisk, color: colors.danger },
      ]}
    />
  );
}
