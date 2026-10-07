import { memo, useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { colors, duration, radius } from '@/theme';
import { clamp } from '@/utils/format';

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  color?: string;
  track?: string;
  height?: number;
  accessibilityLabel?: string;
}

/** Animated fill (UI thread, width via scaleX to avoid layout passes). */
function ProgressBarBase({ value, color = colors.primary, track = colors.surfaceMuted, height = 10, accessibilityLabel }: ProgressBarProps) {
  const reduced = useReducedMotionPref();
  const v = clamp(Number.isFinite(value) ? value : 0, 0, 1);
  const width = useSharedValue(0);
  const progress = useSharedValue(reduced ? v : 0);

  useEffect(() => {
    progress.value = reduced ? v : withTiming(v, { duration: duration.slow });
  }, [v, reduced, progress]);

  const fill = useAnimatedStyle(() => ({ width: width.value * progress.value }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      onLayout={(e: LayoutChangeEvent) => {
        width.value = e.nativeEvent.layout.width;
      }}
      style={[styles.track, { height, backgroundColor: track, borderRadius: height / 2 }]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: height / 2 }, fill]} />
    </View>
  );
}

export const ProgressBar = memo(ProgressBarBase);

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: radius.pill },
  fill: { height: '100%' },
});
