import { memo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ScalePressable, SegmentedControl, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, KID_TOUCH, radius, spacing } from '@/theme';
import type { AvatarCategory, AvatarConfig, AvatarItem } from '@/types';

export const AVATAR_CATEGORIES: AvatarCategory[] = ['skin', 'hair', 'clothes', 'accessories', 'expressions'];

/** Built-in options so customisation works before the shop has items. Diverse skin tones by default. */
export const DEFAULT_AVATAR_OPTIONS: Record<AvatarCategory, AvatarItem[]> = {
  skin: ['#4A2C1D', '#6B4226', '#8D5524', '#C68642', '#E0AC69', '#F1C27D'].map((c, i) => ({ id: `skin-${i}`, category: 'skin', name: c, emoji: '●' })),
  hair: ['🧑🏿‍🦱', '👩🏾‍🦱', '🧑🏽', '👱🏻', '🧑🏿‍🦲', '👩🏿'].map((e, i) => ({ id: `hair-${i}`, category: 'hair', name: `hair ${i + 1}`, emoji: e })),
  clothes: ['👕', '👗', '🥋', '🧥', '👘', '🦺'].map((e, i) => ({ id: `clothes-${i}`, category: 'clothes', name: `outfit ${i + 1}`, emoji: e })),
  accessories: ['🎒', '🧢', '👓', '🎧', '👑', '🪶'].map((e, i) => ({ id: `acc-${i}`, category: 'accessories', name: `accessory ${i + 1}`, emoji: e })),
  expressions: ['😀', '😎', '🤓', '🥳', '😊', '🤩'].map((e, i) => ({ id: `face-${i}`, category: 'expressions', name: `face ${i + 1}`, emoji: e })),
};

export interface AvatarPickerProps {
  category: AvatarCategory;
  onCategoryChange: (c: AvatarCategory) => void;
  items: AvatarItem[];
  value: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
}

function AvatarPickerBase({ category, onCategoryChange, items, value, onChange }: AvatarPickerProps) {
  const { t } = useT();
  return (
    <View style={{ gap: spacing.lg }}>
      <SegmentedControl
        value={category}
        onChange={onCategoryChange}
        segments={AVATAR_CATEGORIES.map((c) => ({ value: c, label: t(`student.avatar.${c}`) }))}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={3}
        scrollEnabled={false}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => {
          const selected = value[category] === item.id;
          const isSkin = category === 'skin';
          return (
            <ScalePressable
              onPress={() => onChange({ ...value, [category]: item.id, ...(isSkin ? { color: item.name } : {}) })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={item.name}
              style={[styles.option, selected && styles.selected]}
            >
              {isSkin ? <View style={[styles.swatch, { backgroundColor: item.name }]} /> : <Text style={styles.emoji}>{item.emoji ?? '⭐'}</Text>}
            </ScalePressable>
          );
        }}
      />
    </View>
  );
}

export const AvatarPicker = memo(AvatarPickerBase);

const styles = StyleSheet.create({
  option: {
    flex: 1,
    minHeight: KID_TOUCH + 24,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  swatch: { width: 44, height: 44, borderRadius: radius.pill },
  emoji: { fontSize: 36, lineHeight: 44 },
});
