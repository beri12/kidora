import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { initials } from '@/utils/format';

import { Text } from './Text';

export interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  color?: string | null;
  size?: number;
  ring?: string;
  emoji?: string;
}

/** Remote avatars are cached on disk by expo-image and downsampled to the rendered size. */
function AvatarBase({ name, uri, color, size = 44, ring, emoji }: AvatarProps) {
  const style = {
    width: size,
    height: size,
    borderRadius: radius.pill,
    backgroundColor: color ?? colors.primarySoft,
    borderWidth: ring ? 3 : 0,
    borderColor: ring,
  };
  return (
    <View style={[styles.base, style]} accessibilityRole="image" accessibilityLabel={name ?? undefined}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" recyclingKey={uri} transition={150} />
      ) : emoji ? (
        <Text style={{ fontSize: size * 0.55, lineHeight: size * 0.7 }}>{emoji}</Text>
      ) : (
        <Text variant="bodyStrong" color={color ? 'textInverse' : 'primary'} style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

export const Avatar = memo(AvatarBase);

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
