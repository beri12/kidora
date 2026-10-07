import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { colors, type ColorToken } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorToken;
  tint?: string;
}

/** Decorative by default (hidden from screen readers); label the parent control instead. */
export function Icon({ name, size = 22, color = 'text', tint }: IconProps) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={tint ?? colors[color]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
