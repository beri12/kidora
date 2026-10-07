import { StyleSheet } from 'react-native';

import { colors, MIN_TOUCH, radius, type ColorToken } from '@/theme';

import { Icon, type IconName } from './Icon';
import { ScalePressable } from './Pressable';

export interface IconButtonProps {
  icon: IconName;
  /** Required: icon-only controls must be named for screen readers. */
  label: string;
  onPress?: () => void;
  color?: ColorToken;
  background?: string;
  size?: number;
  badge?: boolean;
  testID?: string;
}

export function IconButton({ icon, label, onPress, color = 'text', background = colors.surface, size = 22, testID }: IconButtonProps) {
  return (
    <ScalePressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.base, { backgroundColor: background }]}
    >
      <Icon name={icon} size={size} color={color} />
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
