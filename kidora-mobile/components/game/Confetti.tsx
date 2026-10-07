import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { palette } from '@/theme';

/** Deterministic pseudo-random in [0,1): keeps render pure (no Math.random). */
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const COLORS = [palette.kente[500], palette.terracotta[500], palette.brand[500], palette.savanna[500], palette.river[500], palette.coral[400]];

interface PieceSpec {
  x: number;
  delay: number;
  drift: number;
  spin: number;
  color: string;
  size: number;
}

const Piece = memo(function Piece({ spec, height }: { spec: PieceSpec; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(spec.delay, withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }));
  }, [spec.delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * 0.9,
    transform: [{ translateY: -40 + t.value * (height * 0.8) }, { translateX: spec.drift * t.value }, { rotate: `${spec.spin * t.value}deg` }],
  }));
  return <Animated.View style={[styles.piece, { left: spec.x, width: spec.size, height: spec.size * 0.5, backgroundColor: spec.color }, style]} />;
});

/** ~28 pieces max: festive but light on low-end GPUs. Parent skips it under reduced motion. */
function ConfettiBase({ count = 28 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const specs = useMemo<PieceSpec[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: rand(i, 1) * width,
        delay: rand(i, 2) * 300,
        drift: (rand(i, 3) - 0.5) * 120,
        spin: (rand(i, 4) - 0.5) * 720,
        color: COLORS[i % COLORS.length] ?? palette.kente[500],
        size: 8 + rand(i, 5) * 8,
      })),
    [count, width],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {specs.map((s, i) => (
        <Piece key={i} spec={s} height={height} />
      ))}
    </View>
  );
}

export const Confetti = memo(ConfettiBase);

const styles = StyleSheet.create({ piece: { position: 'absolute', top: 0, borderRadius: 2 } });
