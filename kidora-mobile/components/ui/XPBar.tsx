import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/hooks/useT';
import { levelProgress } from '@/lib/level';
import { colors, spacing } from '@/theme';
import { formatNumber } from '@/utils/format';

import { LevelBadge } from './LevelBadge';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';

export interface XPBarProps {
  xp: number;
  compact?: boolean;
}

/** Level badge + animated XP progress to the next level. */
function XPBarBase({ xp, compact }: XPBarProps) {
  const { t, locale } = useT();
  const p = levelProgress(xp);
  return (
    <View style={styles.row}>
      <LevelBadge level={p.level} size={compact ? 36 : 48} />
      <View style={styles.body}>
        <View style={styles.labels}>
          <Text variant="label">{t('common.level', { level: p.level })}</Text>
          <Text variant="label" color="textMuted">
            {`${formatNumber(p.current, locale)} / ${formatNumber(p.span, locale)} XP`}
          </Text>
        </View>
        <ProgressBar
          value={p.ratio}
          color={colors.xp}
          height={compact ? 8 : 12}
          accessibilityLabel={t('student.dashboard.xpToNext', { xp: p.remaining, level: p.level + 1 })}
        />
        {!compact ? (
          <Text variant="caption" color="textMuted">
            {t('student.dashboard.xpToNext', { xp: formatNumber(p.remaining, locale), level: p.level + 1 })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const XPBar = memo(XPBarBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: spacing.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
