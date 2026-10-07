import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { colors } from '@/theme';

/**
 * Procedural island hero art (vector, ~0 KB of bundled bitmaps). Kente-style
 * zig-zag shoreline and warm sun give each island an African-inspired feel
 * without stereotyped imagery. Swap for commissioned art via the same props.
 */
function IslandArtBase({ accent, emoji, size = 116, locked }: { accent: string; emoji: string; size?: number; locked?: boolean }) {
  const tint = locked ? colors.locked : accent;
  return (
    <View style={{ width: size * 1.5, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 150 100">
        <Circle cx={124} cy={20} r={12} fill={locked ? colors.border : colors.accent} opacity={0.9} />
        <Ellipse cx={75} cy={80} rx={66} ry={14} fill={locked ? colors.surfaceMuted : '#BAE6FD'} />
        <Path d="M18 78 C30 48 60 36 75 36 C92 36 120 48 132 78 Z" fill={tint} opacity={0.9} />
        <G opacity={0.55}>
          <Path d="M24 74 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6" stroke={colors.accent} strokeWidth={2.5} fill="none" />
        </G>
        <Path d="M40 60 C46 52 54 50 60 52" stroke="#FFFFFF" strokeWidth={2} opacity={0.5} fill="none" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={{ fontSize: size * 0.32, lineHeight: size * 0.42, opacity: locked ? 0.5 : 1, marginTop: -size * 0.12 }}>{emoji}</Text>
      </View>
    </View>
  );
}

export const IslandArt = memo(IslandArtBase);

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
