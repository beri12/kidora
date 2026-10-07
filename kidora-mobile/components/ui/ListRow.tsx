import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH, spacing } from '@/theme';

import { Icon } from './Icon';
import { ScalePressable } from './Pressable';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  accessibilityHint?: string;
}

function ListRowBase({ title, subtitle, left, right, onPress, chevron = !!onPress, accessibilityHint }: ListRowProps) {
  const content = (
    <>
      {left}
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-forward" size={18} color="textSubtle" /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}>
        {content}
      </View>
    );
  }
  return (
    <ScalePressable onPress={onPress} pressedScale={0.99} accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title} accessibilityHint={accessibilityHint} style={styles.row}>
      {content}
    </ScalePressable>
  );
}

export const ListRow = memo(ListRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH + 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  body: { flex: 1, gap: 2 },
});
