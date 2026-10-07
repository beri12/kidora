import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import type { GameSceneProps } from '@/features/game/engine';
import { nodePosition } from '@/features/game/map';
import { useResponsive } from '@/hooks/useResponsive';
import { useT } from '@/hooks/useT';
import { radius, spacing } from '@/theme';

import { FloatingCharacter } from './FloatingCharacter';
import { MapNodeButton } from './MapNodeButton';

const STEP = 112;

/**
 * 2D island renderer (the MVP implementation of GameRenderer.Scene).
 * One SVG path + absolutely positioned nodes: no canvas, no game loop,
 * cheap enough for low-end Android. The parent ScrollView provides the
 * scrollable world.
 */
function IslandMapBase({ island, nodes, onNodePress }: GameSceneProps) {
  const { t } = useT();
  const { contentWidth } = useResponsive();
  const width = Math.min(contentWidth - spacing.lg * 2, 520);
  const height = 140 + nodes.length * STEP;

  const positions = useMemo(() => nodes.map((_, i) => nodePosition(i, width, STEP)), [nodes, width]);
  const path = useMemo(() => {
    if (positions.length < 2) return '';
    return positions
      .map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = positions[i - 1] ?? p;
        const midY = (prev.y + p.y) / 2;
        return `C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
      })
      .join(' ');
  }, [positions]);

  const currentIndex = nodes.findIndex((n) => n.isCurrent);
  const charPos = positions[currentIndex >= 0 ? currentIndex : 0];

  return (
    <View style={[styles.world, { width, height, backgroundColor: `${island.accent}14` }]} accessibilityRole="list">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={path} stroke={`${island.accent}55`} strokeWidth={14} strokeLinecap="round" fill="none" />
        <Path d={path} stroke="#FFFFFF" strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" fill="none" />
      </Svg>
      {nodes.map((node, i) => {
        const p = positions[i];
        if (!p) return null;
        const showLevel = i === 0 || nodes[i - 1]?.levelIndex !== node.levelIndex;
        return (
          <View key={node.id} style={[styles.abs, { left: p.x - 40, top: p.y - 40, width: 80, height: 80 }]}>
            {showLevel ? (
              <View style={[styles.level, { backgroundColor: island.accent }]}>
                <Text variant="tiny" color="textInverse">
                  {t('common.level', { level: node.levelIndex + 1 })}
                </Text>
              </View>
            ) : null}
            <MapNodeButton node={node} accent={island.accent} index={i} onPress={onNodePress} />
          </View>
        );
      })}
      {charPos ? (
        <View style={[styles.abs, { left: Math.min(width - 56, charPos.x + 38), top: charPos.y - 46 }]} pointerEvents="none">
          <FloatingCharacter emoji={island.character.emoji} label={island.character.name} />
        </View>
      ) : null}
    </View>
  );
}

export const IslandMap = memo(IslandMapBase);

const styles = StyleSheet.create({
  world: { alignSelf: 'center', borderRadius: radius['2xl'], overflow: 'hidden' },
  abs: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  level: { position: 'absolute', top: -18, paddingHorizontal: spacing.sm, borderRadius: radius.pill, zIndex: 2 },
});
