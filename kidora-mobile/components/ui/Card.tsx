import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, type ShadowToken } from '@/theme';

import { ScalePressable } from './Pressable';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** dense = adult dashboards, playful = student world */
  tone?: 'default' | 'playful' | 'dense' | 'tinted';
  tint?: string;
  elevation?: ShadowToken;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function CardBase({ children, onPress, accessibilityLabel, accessibilityHint, tone = 'default', tint, elevation = 'sm', style, testID }: CardProps) {
  const s = [
    styles.base,
    tone === 'playful' && styles.playful,
    tone === 'dense' && styles.dense,
    tone === 'tinted' && { backgroundColor: tint ?? colors.primarySoft, borderColor: 'transparent' },
    shadows[elevation],
    style,
  ];
  if (onPress) {
    return (
      <ScalePressable testID={testID} onPress={onPress} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} pressedScale={0.98} style={s}>
        {children}
      </ScalePressable>
    );
  }
  return (
    <View testID={testID} style={s} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

export const Card = memo(CardBase);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playful: { borderRadius: radius['2xl'], borderWidth: 2, padding: spacing.xl },
  dense: { borderRadius: radius.lg, padding: spacing.md },
});
