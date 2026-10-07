import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { colors } from '@/theme';
import { clamp } from '@/utils/format';

function ProgressRingBase({ value, size = 72, thickness = 8, color = colors.primary, label }: { value: number; size?: number; thickness?: number; color?: string; label: string }) {
  const v = clamp(value, 0, 100);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(v) }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={thickness} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={thickness} fill="none" strokeDasharray={`${(v / 100) * c} ${c}`} strokeLinecap="round" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text variant="label">{`${Math.round(v)}%`}</Text>
      </View>
    </View>
  );
}

export const ProgressRing = memo(ProgressRingBase);

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
