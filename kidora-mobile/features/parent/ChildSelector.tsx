import { ScrollView, StyleSheet } from 'react-native';

import { Avatar, ScalePressable, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme';
import type { ChildSummary } from '@/types';
import { firstName } from '@/utils/format';

export function ChildSelector({ items, value, onChange }: { items: ChildSummary[]; value: string | undefined; onChange: (id: string) => void }) {
  const { t } = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel={t('parent.dashboard.selectChild')}>
      {items.map((c) => {
        const on = c.id === value;
        return (
          <ScalePressable
            key={c.id}
            onPress={() => onChange(c.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={c.displayName ?? firstName(c.name)}
            style={[styles.chip, on && styles.on]}
          >
            <Avatar name={c.name} uri={c.avatarUrl} color={c.avatarColor} size={32} />
            <Text variant="label" color={on ? 'onPrimary' : 'text'}>
              {c.displayName ?? firstName(c.name)}
            </Text>
          </ScalePressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH, paddingLeft: spacing.xs, paddingRight: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
});
