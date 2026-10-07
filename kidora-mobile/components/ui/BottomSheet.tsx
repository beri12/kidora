import { useEffect, type ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { useT } from '@/hooks/useT';
import { colors, radius, spacing, springs } from '@/theme';

import { Text } from './Text';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Lightweight drag-to-dismiss sheet (Gesture Handler + Reanimated, no extra dependency). */
export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotionPref();
  const y = useSharedValue(600);

  useEffect(() => {
    if (visible) y.set(reduced ? 0 : withSpring(0, springs.gentle));
  }, [visible, reduced, y]);

  const close = () => {
    y.set(
      withTiming(600, { duration: 180 }, (done) => {
        if (done) runOnJS(onClose)();
      }),
    );
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) {
        y.set(
          withTiming(600, { duration: 180 }, (done) => {
            if (done) runOnJS(onClose)();
          }),
        );
      } else {
        y.set(withSpring(0, springs.gentle));
      }
    });

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('common.close')} />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheet]} accessibilityViewIsModal>
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea} accessibilityLabel={t('common.close')} accessibilityRole="adjustable">
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          {title ? (
            <Text variant="h3" accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    maxHeight: '85%',
  },
  handleArea: { alignItems: 'center', paddingVertical: spacing.md },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
});
