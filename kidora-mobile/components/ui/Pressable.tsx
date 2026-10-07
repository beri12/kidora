import { forwardRef, type ReactNode } from 'react';
import { Pressable as RNPressable, type PressableProps as RNPressableProps, type View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { haptics } from '@/lib/haptics';
import { springs } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface ScalePressableProps extends Omit<RNPressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** scale when pressed; 1 disables */
  pressedScale?: number;
  haptic?: boolean;
}

/** Pressable with a spring "squish" (UI thread) + light haptic. Honours reduced motion. */
export const ScalePressable = forwardRef<View, ScalePressableProps>(function ScalePressable(
  { pressedScale = 0.96, haptic = true, onPressIn, onPressOut, onPress, style, children, ...rest },
  ref,
) {
  const reduced = useReducedMotionPref();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      onPressIn={(e) => {
        if (!reduced) scale.value = withSpring(pressedScale, springs.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, springs.press);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics.press();
        onPress?.(e);
      }}
      style={[style, animated]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});
