import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme';

export function Legend({ items, vertical }: { items: { label: string; color: string }[]; vertical?: boolean }) {
  return (
    <View style={[styles.wrap, vertical && styles.vertical]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {items.map((i) => (
        <View key={i.label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: i.color }]} />
          <Text variant="tiny" color="textMuted" numberOfLines={1}>
            {i.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  vertical: { flexDirection: 'column', gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
