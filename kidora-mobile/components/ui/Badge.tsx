import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

const TONES: Record<BadgeTone, { bg: string; fg: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'textMuted' | 'text' }> = {
  brand: { bg: colors.primarySoft, fg: 'primary' },
  success: { bg: colors.successSoft, fg: 'success' },
  warning: { bg: colors.warningSoft, fg: 'warning' },
  danger: { bg: colors.dangerSoft, fg: 'danger' },
  info: { bg: colors.infoSoft, fg: 'info' },
  neutral: { bg: colors.surfaceMuted, fg: 'textMuted' },
  accent: { bg: colors.accentSoft, fg: 'text' },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
}

function BadgeBase({ label, tone = 'brand', icon }: BadgeProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={14} color={t.fg} /> : null}
      <Text variant="tiny" color={t.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const Badge = memo(BadgeBase);

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.pill,
  },
});
