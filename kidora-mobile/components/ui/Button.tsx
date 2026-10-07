import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, KID_TOUCH, MIN_TOUCH, radius, shadows, spacing } from '@/theme';

import { Icon, type IconName } from './Icon';
import { ScalePressable } from './Pressable';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'game';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<ButtonVariant, { bg: string; fg: 'onPrimary' | 'primary' | 'text' | 'textInverse'; border?: string; shadow?: boolean }> = {
  primary: { bg: colors.primary, fg: 'onPrimary' },
  secondary: { bg: colors.primarySoft, fg: 'primary' },
  outline: { bg: 'transparent', fg: 'primary', border: colors.primary },
  ghost: { bg: 'transparent', fg: 'primary' },
  danger: { bg: colors.danger, fg: 'textInverse' },
  game: { bg: colors.secondary, fg: 'textInverse', shadow: true },
};

function ButtonBase({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  const height = size === 'lg' || variant === 'game' ? KID_TOUCH : size === 'sm' ? 40 : MIN_TOUCH;
  return (
    <ScalePressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      hitSlop={size === 'sm' ? 8 : 0}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          minHeight: height,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 2 : 0,
          opacity: inactive ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
        },
        v.shadow ? shadows.game : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.fg]} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 20} color={v.fg} /> : null}
          <Text variant={size === 'sm' ? 'label' : 'bodyStrong'} color={v.fg} numberOfLines={1}>
            {label}
          </Text>
          {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 20} color={v.fg} /> : null}
        </View>
      )}
    </ScalePressable>
  );
}

export const Button = memo(ButtonBase);

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
