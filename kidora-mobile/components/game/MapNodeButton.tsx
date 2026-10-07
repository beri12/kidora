import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/Icon';
import { ScalePressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';
import { colors, KID_TOUCH, radius, shadows } from '@/theme';
import type { MapNode } from '@/types';

const ICON: Record<string, IconName> = { LESSON: 'book', CHALLENGE: 'flash', BOSS: 'trophy', QUIZ: 'help', REWARD: 'gift' };

export interface MapNodeButtonProps {
  node: MapNode;
  accent: string;
  index: number;
  onPress: (node: MapNode) => void;
}

/** A lesson node on the island path: completed ✓, current (pulsing), locked 🔒. */
function MapNodeButtonBase({ node, accent, index, onPress }: MapNodeButtonProps) {
  const { t } = useT();
  const reduced = useReducedMotionPref();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!node.isCurrent || reduced) return;
    pulse.value = withRepeat(withSequence(withTiming(1.12, { duration: 650 }), withTiming(1, { duration: 650 })), -1);
    return () => cancelAnimation(pulse);
  }, [node.isCurrent, reduced, pulse]);

  const ring = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const done = node.status === 'COMPLETED';
  const locked = node.status === 'LOCKED';
  const size = node.type === 'BOSS' ? KID_TOUCH + 20 : KID_TOUCH + 8;
  const bg = locked ? colors.locked : done ? colors.success : accent;
  const icon: IconName = done ? 'checkmark' : locked ? 'lock-closed' : (ICON[node.type] ?? 'star');
  const stateKey: TranslationKey = done ? 'common.completed' : locked ? 'common.locked' : node.isCurrent ? 'common.start' : 'common.notStarted';

  return (
    <View style={styles.wrap}>
      {node.isCurrent ? <Animated.View style={[styles.ring, { width: size + 18, height: size + 18, borderColor: accent }, ring]} /> : null}
      <ScalePressable
        testID={`map-node-${index}`}
        onPress={() => onPress(node)}
        accessibilityRole="button"
        accessibilityLabel={`${t(`game.node.${node.type}` as TranslationKey)} ${index + 1}: ${node.title}. ${t(stateKey)}`}
        accessibilityHint={locked ? t('game.nodeLocked') : undefined}
        accessibilityState={{ disabled: locked }}
        style={[styles.node, shadows.game, { width: size, height: size, backgroundColor: bg }]}
      >
        <Icon name={icon} size={node.type === 'BOSS' ? 32 : 26} color="textInverse" />
      </ScalePressable>
      {!locked && !done ? (
        <View style={[styles.xp, { backgroundColor: colors.accent }]}>
          <Text variant="tiny" color="text">
            {t('game.plusXp', { xp: node.xpReward })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export const MapNodeButton = memo(MapNodeButtonBase);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: radius.pill, borderWidth: 3, opacity: 0.6 },
  node: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFFFFFAA' },
  xp: { position: 'absolute', bottom: -10, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill },
});
