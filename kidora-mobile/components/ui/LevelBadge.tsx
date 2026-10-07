import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useT } from '@/hooks/useT';
import { colors } from '@/theme';

import { Text } from './Text';

/** Shield-shaped level badge (SVG, scales without bitmaps). */
function LevelBadgeBase({ level, size = 48 }: { level: number; size?: number }) {
  const { t } = useT();
  return (
    <View style={{ width: size, height: size * 1.1 }} accessible accessibilityLabel={t('common.level', { level })}>
      <Svg width={size} height={size * 1.1} viewBox="0 0 40 44">
        <Path d="M20 1 L38 8 V22 C38 33 30 40 20 43 C10 40 2 33 2 22 V8 Z" fill={colors.accent} stroke={colors.warning} strokeWidth={2} />
        <Path d="M20 6 L33 11 V22 C33 30 27 35 20 38 C13 35 7 30 7 22 V11 Z" fill={colors.primary} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text variant="h3" color="textInverse" style={{ fontSize: size * 0.36, lineHeight: size * 0.46 }}>
          {level}
        </Text>
      </View>
    </View>
  );
}

export const LevelBadge = memo(LevelBadgeBase);

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
