import { memo, useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';

/** Gently bobbing guide character. One shared value, UI thread only. */
function FloatingCharacterBase({ emoji, size = 40, label }: { emoji: string; size?: number; label?: string }) {
  const reduced = useReducedMotionPref();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    y.value = withRepeat(
      withSequence(withTiming(-6, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })),
      -1,
    );
    return () => cancelAnimation(y);
  }, [reduced, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={style} accessible={!!label} accessibilityLabel={label}>
      <Text style={{ fontSize: size, lineHeight: size * 1.25 }}>{emoji}</Text>
    </Animated.View>
  );
}

export const FloatingCharacter = memo(FloatingCharacterBase);
